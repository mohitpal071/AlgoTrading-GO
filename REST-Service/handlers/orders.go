package handlers

import (
	"fmt"
	"net/http"

	kiteconnect "gokiteconnect-master"

	"github.com/gin-gonic/gin"
)

// GetOrders handles the GET /orders route
func (ctrl *Controller) GetOrders(c *gin.Context) {
	orders, err := ctrl.KiteClient.GetOrders()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, orders)
}

// GetTrades handles the GET /trades route
func (ctrl *Controller) GetTrades(c *gin.Context) {
	trades, err := ctrl.KiteClient.GetTrades()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, trades)
}

// GetOrderHistory handles the GET /orders/:order_id route
func (ctrl *Controller) GetOrderHistory(c *gin.Context) {
	orderID := c.Param("order_id")
	history, err := ctrl.KiteClient.GetOrderHistory(orderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, history)
}

// GetOrderTrades handles the GET /orders/:order_id/trades route
func (ctrl *Controller) GetOrderTrades(c *gin.Context) {
	orderID := c.Param("order_id")
	trades, err := ctrl.KiteClient.GetOrderTrades(orderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, trades)
}

// PlaceOrder handles the POST /orders/:variety route
func (ctrl *Controller) PlaceOrder(c *gin.Context) {
	variety := c.Param("variety")
	var params kiteconnect.OrderParams

	// Auto-detects JSON, query params, and form-data
	if err := c.ShouldBind(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	fmt.Printf("Parsed params: %+v\n", params)
	response, err := ctrl.KiteClient.PlaceOrder(variety, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

// ModifyOrder handles the PUT /orders/:variety/:order_id route
func (ctrl *Controller) ModifyOrder(c *gin.Context) {
	variety := c.Param("variety")
	orderID := c.Param("order_id")
	var params kiteconnect.OrderParams
	// Auto-detects JSON, query params, and form-data
	if err := c.ShouldBind(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	fmt.Printf("Parsed params: %+v\n", params)
	response, err := ctrl.KiteClient.ModifyOrder(variety, orderID, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

// CancelOrder handles the DELETE /orders/:variety/:order_id route
func (ctrl *Controller) CancelOrder(c *gin.Context) {
	variety := c.Param("variety")
	orderID := c.Param("order_id")
	parentOrderID := c.Query("parent_order_id") // Optional query param

	var parentOrderIDPtr *string
	if parentOrderID != "" {
		parentOrderIDPtr = &parentOrderID
	}

	response, err := ctrl.KiteClient.CancelOrder(variety, orderID, parentOrderIDPtr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}
