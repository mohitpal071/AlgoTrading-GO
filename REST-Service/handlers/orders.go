package handlers

import (
	"net/http"

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
