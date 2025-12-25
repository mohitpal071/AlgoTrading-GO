package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"rest-service/handlers"
	"rest-service/internal/socket"
	"rest-service/internal/store"
	kiteticker "rest-service/internal/ticker"

	kiteconnect "gokiteconnect-master"
	"gokiteconnect-master/models"

	"rest-service/internal/options"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

var (
	manager *socket.ClientManager
	ticker  *kiteticker.ExtendedTicker
)

func main() {
	// Load .env file from parent directory
	if err := godotenv.Load("../.env"); err != nil {
		log.Printf("Warning: Error loading .env file: %v", err)
	}

	encToken := os.Getenv("ENCTOKEN")
	if encToken == "" {
		log.Fatal("ENCTOKEN not found in environment")
	}

	// --- Ticker & Store Setup ---

	// Initialize ticker
	ticker = kiteticker.StartTicker()

	// Initialize WebSocket Client Manager
	manager = socket.NewClientManager(ticker)
	go manager.Start()

	// Handle incoming ticks
	// We use OnTick for structured data (easier for Store)
	// AND OnBinaryTick for raw broadcasting (bandwidth efficient for proxying)?
	// Actually, gokiteconnect Ticker calls OnTick AFTER parsing OnBinaryTick.
	// If we use OnBinaryTick, we interrupt the flow unless we call the callbacks ourselves?
	// Let's check `ticker.go`: readMessage -> if binary -> parseBinary -> triggerTick.
	// So OnTick is called automatically.

	// BUT `kiteticker.ExtendedTicker` might have simpler OnBinaryTick we used earlier?
	// In Ticker-Service main.go: `ticker.OnBinaryTick(...)`
	// Let's see `kiteticker.go`: it has `OnBinaryTick`.

	// STRATEGY:
	// 1. Use OnBinaryTick to BROADCAST raw bytes to WS clients (efficient).
	// 2. Use OnTick to UPDATE Store (parsed).
	// Ticker implementation in `internal/ticker` supports both?
	// Looking at previous `ticker.go`, it does `triggerMessage` (raw) AND `triggerTick` (parsed).
	// So we can subscribe to both!

	ticker.OnBinaryTick(func(tick []byte) {
		// Broadcast raw bytes to connected WS clients
		manager.Broadcast(tick)
	})

	ticker.OnTick(func(tick models.Tick) {
		// Update in-memory store
		store.GlobalStore.UpdateFromTick(tick)
	})

	// Start Ticker
	go func() {
		log.Println("Starting Kite Ticker...")
		ticker.Serve()
	}()

	// --- REST API Setup ---

	// Initialize Kite Connect client
	kc := kiteconnect.NewWithEncToken(encToken)

	scanner := options.NewScanner(kc)
	if err := scanner.ScanInstruments(); err != nil {
		log.Fatalf("Failed to scan options: %v", err)
	}

	// See what you found
	underlyings := scanner.GetUnderlyings()
	log.Printf("Found %d underlyings:", len(underlyings))

	// for _, underlying := range underlyings {
	// 	fmt.Println(underlying)
	// }

	// Get NIFTY expiries
	// expiries := scanner.GetExpiries("NIFTY")
	// for _, expiry := range expiries {
	// 	log.Printf("NIFTY expiry: %s", expiry.Format("2006-01-02"))
	// }

	// Initialize Handler Controller
	ctrl := handlers.NewController(kc)

	r := gin.Default()

	// WebSocket Endpoint
	r.GET("/ws", func(c *gin.Context) {
		manager.HandleNewConnection(c.Writer, c.Request)
	})

	// Quote Endpoint (Read from Memory)
	r.GET("/quote/:token", func(c *gin.Context) {
		tokenStr := c.Param("token")
		token, err := strconv.ParseUint(tokenStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid token"})
			return
		}

		tick, found := store.GlobalStore.Get(uint32(token))
		if !found {
			c.JSON(http.StatusNotFound, gin.H{"error": "Tick not found. Ensure Ticker is subscribed."})
			return
		}
		c.JSON(http.StatusOK, tick)
	})

	r.GET("/ltp/:token", func(c *gin.Context) {
		tokenStr := c.Param("token")
		token, err := strconv.ParseUint(tokenStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid token"})
			return
		}

		tick, found := store.GlobalStore.Get(uint32(token))
		if !found {
			c.JSON(http.StatusNotFound, gin.H{"error": "Tick not found. Ensure Ticker is subscribed."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ltp": tick.LastPrice})
	})

	r.GET("/user/profile/full", ctrl.GetProfile)
	r.GET("/user/margins", ctrl.GetMargins)
	r.GET("/portfolio/holdings", ctrl.GetHoldings)
	r.GET("/portfolio/positions", ctrl.GetPositions)
	r.GET("/orders", ctrl.GetOrders)
	r.GET("/trades", ctrl.GetTrades)
	r.GET("/orders/:order_id", ctrl.GetOrderHistory)
	r.GET("/orders/:order_id/trades", ctrl.GetOrderTrades)

	r.POST("/orders/:variety", ctrl.PlaceOrder)
	r.PUT("/orders/:variety/:order_id", ctrl.ModifyOrder)
	r.DELETE("/orders/:variety/:order_id", ctrl.CancelOrder)

	port := "8080"
	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	// Start Server in a goroutine
	go func() {
		log.Printf("Starting Unified Service on port %s...\n", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server with
	// a timeout of 5 seconds.
	quit := make(chan os.Signal, 1)
	// kill (no param) default send syscall.SIGTERM
	// kill -2 is syscall.SIGINT
	// kill -9 is syscall.SIGKILL but can't be caught, so don't need to add it
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// The context is used to inform the server it has 5 seconds to finish
	// the request it is currently handling
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown: ", err)
	}

	// Stop Ticker
	if ticker != nil {
		ticker.Stop()
		log.Println("Ticker stopped")
	}

	log.Println("Server exiting")
}
