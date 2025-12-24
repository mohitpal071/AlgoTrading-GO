package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetMargins handles the GET /margins route
func (ctrl *Controller) GetMargins(c *gin.Context) {
	margins, err := ctrl.KiteClient.GetUserMargins()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, margins)
}
