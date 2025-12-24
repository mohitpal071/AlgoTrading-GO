package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetProfile handles the GET /profile route
func (ctrl *Controller) GetProfile(c *gin.Context) {
	profile, err := ctrl.KiteClient.GetFullUserProfile()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, profile)
}
