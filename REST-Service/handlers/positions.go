package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetPositions handles the GET /positions route
func (ctrl *Controller) GetPositions(c *gin.Context) {
	positions, err := ctrl.KiteClient.GetPositions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, positions)
}
