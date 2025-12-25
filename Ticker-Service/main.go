package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ticker-service/internal/socket"
	kiteticker "ticker-service/ticker"

	"github.com/joho/godotenv"
)

var (
	manager *socket.ClientManager
	ticker  *kiteticker.ExtendedTicker
)

func init() {
	// Initialize ticker
	ticker = kiteticker.StartTicker()
	// Initialize manager with ticker dependency
	manager = socket.NewClientManager(ticker)
}

func startWsServer() {
	// Server Config
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: nil, // Use default mux
	}

	go func() {
		log.Printf("WebSocket server starting on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Context for graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	// Close ticker connection
	if ticker != nil {
		ticker.Close()
		log.Println("Ticker connection closed")
	}

	log.Println("Server exiting")
	os.Exit(0)
}

func main() {
	// Load .env file
	err := godotenv.Load("../.env")
	if err != nil {
		log.Printf("Warning: Error loading .env file: %v", err)
	}

	// Start manager loop
	go manager.Start()

	// Register WebSocket handler from socket package
	http.HandleFunc("/ws", manager.HandleNewConnection)

	// Start Ticker in a goroutine so it doesn't block server startup
	go func() {
		log.Println("Starting Kite Ticker...")
		ticker.OnBinaryTick(func(tick []byte) {
			manager.Broadcast(tick)
		})
		ticker.Serve()
	}()

	startWsServer()
}
