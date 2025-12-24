package main

import (
	"fmt"
	"log"
	"os"
	"rest-service/handlers"

	kiteconnect "gokiteconnect-master"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
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

	// Initialize Kite Connect client
	kc := kiteconnect.NewWithEncToken(encToken)

	// Initialize Handler Controller
	ctrl := handlers.NewController(kc)

	r := gin.Default()

	r.GET("/profile", ctrl.GetProfile)

	r.GET("/margins", ctrl.GetMargins)

	r.GET("/holdings", ctrl.GetHoldings)

	r.GET("/positions", ctrl.GetPositions)

	r.GET("/orders", ctrl.GetOrders)

	port := "8080"
	fmt.Printf("Starting server on port %s...\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
