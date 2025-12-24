package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetHoldings handles the GET /holdings route
func (ctrl *Controller) GetHoldings(c *gin.Context) {
	holdings, err := ctrl.KiteClient.GetHoldings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, holdings)
}
