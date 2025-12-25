package kiteticker

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/url"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"gokiteconnect-master/models"

	// "github.com/zerodha/gokiteconnect/v4/models"
)

type extendedCallbacks struct {
	callbacks
	onBinaryTick func([]byte)
}

type ExtendedTicker struct {
	*Ticker
	extendedCallbacks
}

// New creates a new ExtendedTicker instance.
func ExtendedNew(apiKey string, accessToken string) *ExtendedTicker {
	ticker := &ExtendedTicker{
		Ticker: New(apiKey, accessToken)}

	return ticker
}

// OnBinaryTick callback.
func (t *ExtendedTicker) OnBinaryTick(f func(tick []byte)) {
	t.extendedCallbacks.onBinaryTick = f
}

func (t *ExtendedTicker) triggerBinaryTick(tick []byte) {
	if t.extendedCallbacks.onBinaryTick != nil {
		t.extendedCallbacks.onBinaryTick(tick)
	}
}

// Serve starts the connection to ticker server. Since its blocking its
// recommended to use it in a go routine.
func (t *ExtendedTicker) Serve() {
	t.ServeWithContext(context.Background())
}


// ServeWithContext starts the connection to ticker server and additionally
// accepts a context. Since its blocking its recommended to use it in a go
// routine.
func (t *ExtendedTicker) ServeWithContext(ctx context.Context) {
	ctx, cancel := context.WithCancel(ctx)
	t.cancel = cancel


	for {
		select {
		case <-ctx.Done():
			return
		default:
			// If reconnect attempt exceeds max then close the loop
			if t.reconnectAttempt > t.reconnectMaxRetries {
				t.triggerNoReconnect(t.reconnectAttempt)
				return
			}

			// If its a reconnect then wait exponentially based on reconnect attempt
			if t.reconnectAttempt > 0 {
				nextDelay := time.Duration(math.Pow(2, float64(t.reconnectAttempt))) * time.Second
				if nextDelay > t.reconnectMaxDelay || nextDelay <= 0 {
					nextDelay = t.reconnectMaxDelay
				}

				t.triggerReconnect(t.reconnectAttempt, nextDelay)

				time.Sleep(nextDelay)

				// Close the previous connection if exists
				if t.Conn != nil {
					t.Conn.Close()
				}
			}
 
			// Prepare ticker URL with required params.
			q := t.url.Query()
			t.url.RawQuery = q.Encode()

			// create a dialer
			d := websocket.DefaultDialer
			d.HandshakeTimeout = t.connectTimeout
			fmt.Println(os.Getenv("ENCTOKEN"))

			// var ws_url = "wss://ws.zerodha.com/?api_key=kitefront&user_id=VM2107&enctoken="+ os.Getenv("ENC_TOKEN")+ "%3D%3D&uid=1745504664336&user-agent=kite3-web&version=3.0.0"
			url, _ := url.Parse("wss://ws.zerodha.com/")
			query := url.Query()
			query.Set("api_key", "kitefront")
			query.Set("user_id", "VM2107")
			query.Set("enctoken", os.Getenv("ENCTOKEN"))
			query.Set("uid", "1745504664336")
			query.Set("user-agent", "kite3-web")
			query.Set("version", "3.0.0")
			url.RawQuery = query.Encode()
			ws_url := url.String()

			fmt.Println("ws_url: ", ws_url)
			conn, _, err := d.Dial(ws_url, nil)
			if err != nil {
				t.triggerError(err)

				// If auto reconnect is enabled then try reconneting else return error
				if t.autoReconnect {
					t.reconnectAttempt++
					continue
				}
			}

			// Close the connection when its done.
			defer func() {
				if t.Conn != nil {
					t.Conn.Close()
				}
			}()

			// Assign the current connection to the instance.
			t.Conn = conn

			// Trigger connect callback.
			t.triggerConnect()

			// Resubscribe to stored tokens
			if t.reconnectAttempt > 0 {
				t.Resubscribe()
			}

			// Reset auto reconnect vars
			t.reconnectAttempt = 0

			// Set current time as last ping time
			t.lastPingTime.Set(time.Now())

			// Set on close handler
			t.Conn.SetCloseHandler(t.handleClose)

			var wg sync.WaitGroup

			// Receive ticker data in a go routine.
			wg.Add(1)
			go t.readMessage(ctx, &wg)

			// Run watcher to check last ping time and reconnect if required
			if t.autoReconnect {
				wg.Add(1)
				go t.checkConnection(ctx, &wg)
			}

			// Wait for go routines to finish before doing next reconnect
			wg.Wait()
		}
	}
}

// readMessage reads the data in a loop.
func (t *ExtendedTicker) readMessage(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	for {
		select {
		case <-ctx.Done():
			return
		default:
			mType, msg, err := t.Conn.ReadMessage()
			if err != nil {
				t.triggerError(fmt.Errorf("Error reading data: %v", err))
				return
			}

			// Update last ping time to check for connection
			t.lastPingTime.Set(time.Now())

			// Trigger message.
			t.triggerMessage(mType, msg)

			// If binary message then parse and send tick.
			if mType == websocket.BinaryMessage {
				t.triggerBinaryTick(msg)
				ticks, err := t.parseBinary(msg)
				if err != nil {
					t.triggerError(fmt.Errorf("Error parsing data received: %v", err))
				}

				// Trigger individual tick.
				for _, tick := range ticks {
					t.triggerTick(tick)
				}
			} else if mType == websocket.TextMessage {
				t.processTextMessage(msg)
			}
		}
	}
}

// SetMode changes mode for given list of tokens and mode.
func (t *ExtendedTicker) SetFullMode(tokens []uint32) error {
	if len(tokens) == 0 {
		return nil
	}

	out, err := json.Marshal(tickerInput{
		Type: "mode",
		Val:  []interface{}{ModeFull, tokens},
	})
	if err != nil {
		return err
	}

	// Set mode in current subscriptions stored
	for _, ts := range tokens {
		t.subscribedTokens[ts] = ModeFull
	}

	return t.Conn.WriteMessage(websocket.TextMessage, out)
}

// parseBinary parses the packets to ticks.
func (t *ExtendedTicker) ParseBinary(inp []byte) ([]models.Tick, error) {
	pkts := t.splitPackets(inp)
	var ticks []models.Tick

	for _, pkt := range pkts {
		tick, err := parsePacket(pkt)
		if err != nil {
			return nil, err
		}

		ticks = append(ticks, tick)
	}

	return ticks, nil
}
