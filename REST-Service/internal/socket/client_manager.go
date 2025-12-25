package socket

import (
	"encoding/json"
	"fmt"
	"log"

	"net/http"

	kiteticker "rest-service/internal/ticker"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type ClientManager struct {
	clientList     map[*Client]bool
	broadcast      chan []byte
	register       chan *Client
	unregister     chan *Client
	subscribeToken chan []uint32
	tokenMap       map[uint32]bool
	ticker         *kiteticker.ExtendedTicker // Dependency
}

// NewClientManager creates a new instance and injects the ticker dependency
func NewClientManager(t *kiteticker.ExtendedTicker) *ClientManager {
	return &ClientManager{
		clientList:     make(map[*Client]bool),
		broadcast:      make(chan []byte),
		register:       make(chan *Client),
		unregister:     make(chan *Client),
		subscribeToken: make(chan []uint32),
		tokenMap:       make(map[uint32]bool),
		ticker:         t,
	}
}

// Start starts the manager loop
func (m *ClientManager) Start() {
	for {
		select {

		case client := <-m.register:
			m.clientList[client] = true
			log.Printf("New client connected from %s. Total clients: %d", client.conn.RemoteAddr(), len(m.clientList))

		case client := <-m.unregister:
			if _, ok := m.clientList[client]; ok {
				delete(m.clientList, client)
				log.Printf("Client disconnected (%s). Total clients: %d", client.conn.RemoteAddr(), len(m.clientList))
			}

		case msg := <-m.broadcast:
			for c := range m.clientList {
				if len(msg) == 1 {
					if err := c.conn.WriteMessage(websocket.BinaryMessage, msg); err != nil {
						log.Printf("Write error: %v", err)
						c.conn.Close()
						m.unregister <- c
					}
				} else {
					if err := c.conn.WriteMessage(websocket.BinaryMessage, c.filterBinaryMsg(msg)); err != nil {
						log.Printf("Write error: %v", err)
						c.conn.Close()
						m.unregister <- c
					}
				}

			}

		case tokenList := <-m.subscribeToken:

			if len(tokenList) > 0 {

				_tokenList := []uint32{}
				for _, token := range tokenList {
					if _, ok := m.tokenMap[token]; !ok {
						_tokenList = append(_tokenList, token)
					}
				}
				if err := m.ticker.Subscribe(_tokenList); err == nil {
					err = m.ticker.SetFullMode(_tokenList)
					if err != nil {
						fmt.Println("err: ", err)
					} else {
						for _, token := range _tokenList {
							m.tokenMap[token] = true
						}
						log.Println("Successfully Subscribed !!")
					}
				} else {
					log.Println("Err : ", err)
				}
			}

		}
	}
}

// Broadcast sends a message to the broadcast channel
func (m *ClientManager) Broadcast(msg []byte) {
	m.broadcast <- msg
}

func (m *ClientManager) HandleNewConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Error while upgrading connection")
		return
	}

	client := Client{conn: conn, manager: m, tokenMap: map[uint32]bool{}}

	defer func() {
		m.unregister <- &client
		conn.Close()
	}()

	m.register <- &client

	for {
		messageType, message, err := conn.ReadMessage()

		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				// Normal closure
			} else {
				log.Printf("Error reading message: %v", err)
			}
			break
		}

		var data Payload
		if err := json.Unmarshal(message, &data); err != nil {
			log.Println("JSON Unmarshal error:", err)
			continue
		}

		log.Printf("Message received (type: %d): %s", messageType, message)
		switch data.Type {
		case "subscribe":
			client.mu.Lock()
			for _, token := range data.Val {
				client.tokenMap[token] = true
			}
			client.mu.Unlock()
			m.subscribeToken <- data.Val

		case "unsubscribe":
			client.mu.Lock()
			for _, token := range data.Val {
				delete(client.tokenMap, token)
			}
			client.mu.Unlock()

		default:
			log.Println("Invalid request type")
		}

	}
}
