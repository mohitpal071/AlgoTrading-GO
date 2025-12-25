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
	fmt.Printf("Starting server on port %s...\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
