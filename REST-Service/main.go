package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"rest-service/handlers"
	"rest-service/internal/config"
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
	manager    *socket.ClientManager
	ticker     *kiteticker.ExtendedTicker
	calculator *options.Calculator
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
	// Initialize Kite Connect client
	kc := kiteconnect.NewWithEncToken(encToken)
	ticker = kiteticker.StartTicker()
	scanner := options.NewScanner(kc)

	// Initialize Greeks Calculator (6% risk-free rate)
	calculator = options.NewCalculator(scanner, 0.06)

	// Initialize WebSocket Client Manager
	manager = socket.NewClientManager(ticker)
	go manager.Start()

	ticker.OnBinaryTick(func(tick []byte) {
		// Broadcast raw bytes to connected WS clients
		// fmt.Println(tick)
		// fmt.Println("Binary Message Received: ", tick)

		manager.Broadcast(tick)
	})

	ticker.OnTick(func(tick models.Tick) {
		// Update in-memory store
		// fmt.Println(tick)
		store.GlobalStore.UpdateFromTick(tick)
		UpdateOptionData(tick, scanner)
	})

	// Start Ticker
	go func() {
		log.Println("Starting Kite Ticker...")
		ticker.Serve()
	}()

	// Load configuration
	cfg, err := config.LoadConfig("config.json")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	OptionScanner(scanner)
	FilterCriteriaAndSubscribeTokens(scanner, ticker, cfg)
	SubscribeToUnderlyings(scanner, ticker, cfg)

	// Initialize Handler Controller
	ctrl := handlers.NewController(kc, scanner)

	r := gin.Default()

	// CORS Middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

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

	r.GET("/instruments", ctrl.GetInstruments)
	r.GET("/user/profile/full", ctrl.GetProfile)
	r.GET("/user/margins", ctrl.GetMargins)
	r.GET("/portfolio/holdings", ctrl.GetHoldings)
	r.GET("/portfolio/positions", ctrl.GetPositions)
	r.GET("/orders", ctrl.GetOrders)
	r.GET("/trades", ctrl.GetTrades)
	r.GET("/orders/:order_id", ctrl.GetOrderHistory)
	r.GET("/orders/:order_id/trades", ctrl.GetOrderTrades)
	r.GET("/historical/:instrument_token/:interval", ctrl.GetHistoricalData)

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

func OptionScanner(scanner *options.Scanner) {
	if err := scanner.ScanInstruments(); err != nil {
		log.Fatalf("Failed to scan options: %v", err)
	}

	// See what you found
	underlyings := scanner.GetUnderlyings()
	log.Printf("Found %d underlyings:", len(underlyings))

}

func FilterCriteriaAndSubscribeTokens(scanner *options.Scanner, ticker *kiteticker.ExtendedTicker, cfg *config.Config) {
	// Get filter criteria for all underlyings
	allCriteria, err := cfg.GetAllFilterCriteria()
	if err != nil {
		log.Fatalf("Invalid filter criteria: %v", err)
	}

	// Collect all tokens from all underlyings
	allTokensMap := make(map[uint32]*options.OptionInstrument)

	for _, criteria := range allCriteria {
		tokensMap := scanner.FilterOptions(criteria)
		log.Printf("Found %d matching options for %s", len(tokensMap), criteria.Underlying)

		// Merge tokens into the main map
		for token, inst := range tokensMap {
			allTokensMap[token] = inst
		}
	}

	log.Printf("Total unique options found across all underlyings: %d", len(allTokensMap))

	// Subscribe in batches using config settings
	batchSize := cfg.Subscription.BatchSize
	batchDelay := time.Duration(cfg.Subscription.BatchDelayMs) * time.Millisecond

	keys := make([]uint32, 0, len(allTokensMap))
	for key := range allTokensMap {
		keys = append(keys, key)
	}

	for i := 0; i < len(keys); i += batchSize {
		end := i + batchSize
		if end > len(keys) {
			end = len(keys)
		}

		batch := keys[i:end]

		if err := ticker.Subscribe(batch); err == nil {
			err = ticker.SetFullMode(batch)
			if err != nil {
				log.Printf("Error setting mode for batch %d-%d: %v", i, end, err)
			} else {
				log.Printf("Successfully subscribed batch %d-%d (%d tokens)", i, end, len(batch))
				for _, key := range batch {
					fmt.Println(allTokensMap[key])
				}
			}
		} else {
			log.Printf("Error subscribing batch %d-%d: %v", i, end, err)
		}

		// Add delay between batches to avoid rate limiting
		if i+batchSize < len(keys) {
			time.Sleep(batchDelay)
		}
	}
}

// SubscribeToUnderlyings subscribes to underlying tokens for price tracking
func SubscribeToUnderlyings(scanner *options.Scanner, ticker *kiteticker.ExtendedTicker, cfg *config.Config) {
	// Get all unique underlyings from config
	underlyingSet := make(map[string]bool)
	for _, uc := range cfg.Underlyings {
		underlyingSet[uc.Underlying] = true
	}

	// Find underlying tokens from instruments
	underlyingTokens := make([]uint32, 0)
	allInstruments, err := scanner.GetAllInstruments()
	if err != nil {
		log.Printf("Warning: Could not get all instruments to find underlying tokens: %v", err)
		return
	}

	for _, inst := range allInstruments {
		// Check if this is an underlying (not an option) and matches our config
		if inst.InstrumentType == "EQ" && inst.Exchange == "NSE" { // For Now we are only interested in Equity Instruments not in Futures or Options
			if (inst.Tradingsymbol == "NIFTY 50" && underlyingSet["NIFTY"]) || underlyingSet[inst.Tradingsymbol] {
				underlyingTokens = append(underlyingTokens, uint32(inst.InstrumentToken))
				log.Printf("Found underlying token for %s: %d", inst.Tradingsymbol, inst.InstrumentToken)
			}
		}
	}

	if len(underlyingTokens) > 0 {
		log.Printf("Subscribing to %d underlying tokens", len(underlyingTokens))
		if err := ticker.Subscribe(underlyingTokens); err != nil {
			log.Printf("Error subscribing to underlying tokens: %v", err)
		} else {
			if err := ticker.SetFullMode(underlyingTokens); err != nil {
				log.Printf("Error setting mode for underlying tokens: %v", err)
			}
		}
	}
}

// UpdateOptionData updates option data and calculates Greeks
func UpdateOptionData(tick models.Tick, scanner *options.Scanner) {
	inst, ok := scanner.GetInstrument(tick.InstrumentToken)
	if inst.InstrumentType != "CE" && inst.InstrumentType != "PE" {
		return
	}
	if !ok {
		fmt.Println("Instrument not found ", tick.InstrumentToken)
		return // Not an option
	}

	// Get chain and update
	underlying := inst.Name
	chain, ok := scanner.GetOptionChain(underlying, inst.Expiry)
	if !ok {
		fmt.Println("Chain not found ", underlying, inst.Expiry)
		return
	}

	strikeData, ok := chain.Strikes[inst.StrikePrice]
	if !ok {
		return
	}

	// Update option data
	var optionData *options.OptionData
	if inst.InstrumentType == options.Call && strikeData.Call != nil {
		strikeData.Call.UpdateFromTick(tick)
		optionData = strikeData.Call
	} else if inst.InstrumentType == options.Put && strikeData.Put != nil {
		strikeData.Put.UpdateFromTick(tick)
		optionData = strikeData.Put
	}

	// Calculate Greeks if we have option data
	if optionData != nil && calculator != nil {
		calculator.CalculateAllGreeks(optionData, chain)
	}
}
