// Package kiteticker provides kite ticker access using callbacks.
package kiteticker

import (
	"fmt"
	"log"
	"time"
)

var (
	ticker *ExtendedTicker
)

var (
	InstToken = []uint32{408065, 112129}
)

// Triggered when any error is raised
func onError(err error) {
	fmt.Println("Error: ", err)
}

// Triggered when websocket connection is closed
func onClose(code int, reason string) {
	fmt.Println("Close: ", code, reason)
}

// Triggered when connection is established and ready to send and accept data
func onConnect() {
	fmt.Println("Connected")
	return
	err := ticker.Subscribe(InstToken)
	if err != nil {
		fmt.Println("err: ", err)
	}
	// Set subscription mode for the subscribed token
	// Default mode is Quote
	err = ticker.SetMode(ModeFull, InstToken)
	if err != nil {
		fmt.Println("err: ", err)
	}

}

// Triggered when reconnection is attempted which is enabled by default
func onReconnect(attempt int, delay time.Duration) {
	fmt.Printf("Reconnect attempt %d in %fs\n", attempt, delay.Seconds())
}

// Triggered when maximum number of reconnect attempt is made and the program is terminated
func onNoReconnect(attempt int) {
	fmt.Printf("Maximum no of reconnect attempt reached: %d", attempt)
}

func GetTicker() *ExtendedTicker {
	return ticker
}

func StartTicker() *ExtendedTicker {

	ticker = ExtendedNew("a", "b")
	ticker.OnError(onError)
	ticker.OnClose(onClose)
	ticker.OnConnect(onConnect)
	ticker.OnReconnect(onReconnect)
	ticker.OnNoReconnect(onNoReconnect)

	log.Println("Hello")

	return ticker

}
