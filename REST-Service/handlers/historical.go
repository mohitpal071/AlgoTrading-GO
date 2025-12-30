package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// GetHistoricalData handles the GET /historical/:instrument_token/:interval route
func (ctrl *Controller) GetHistoricalData(c *gin.Context) {
	// Parse instrument token
	tokenStr := c.Param("instrument_token")
	instrumentToken, err := strconv.Atoi(tokenStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instrument token"})
		return
	}

	// Parse interval
	interval := c.Param("interval")
	validIntervals := map[string]bool{
		"minute":   true,
		"3minute":  true,
		"5minute":  true,
		"10minute": true,
		"15minute": true,
		"30minute": true,
		"60minute": true,
		"day":      true,
	}
	if !validIntervals[interval] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid interval. Valid intervals: minute, 3minute, 5minute, 10minute, 15minute, 30minute, 60minute, day"})
		return
	}

	// Parse query parameters
	fromStr := c.Query("from")
	toStr := c.Query("to")
	if fromStr == "" || toStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from and to parameters are required (format: yyyy-mm-dd or yyyy-mm-dd hh:mm:ss)"})
		return
	}

	// Parse dates
	fromDate, err := parseDate(fromStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid from date format. Use yyyy-mm-dd or yyyy-mm-dd hh:mm:ss"})
		return
	}

	toDate, err := parseDate(toStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid to date format. Use yyyy-mm-dd or yyyy-mm-dd hh:mm:ss"})
		return
	}

	// Parse optional parameters
	continuous := c.DefaultQuery("continuous", "0") == "1"
	oi := c.DefaultQuery("oi", "0") == "1"

	// Fetch historical data
	historicalData, err := ctrl.KiteClient.GetHistoricalData(instrumentToken, interval, fromDate, toDate, continuous, oi)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Convert to response format
	candles := make([][]interface{}, len(historicalData))
	for i, data := range historicalData {
		candle := []interface{}{
			data.Date.Format("2006-01-02T15:04:05-0700"),
			data.Open,
			data.High,
			data.Low,
			data.Close,
			data.Volume,
		}
		if oi && data.OI > 0 {
			candle = append(candle, data.OI)
		}
		candles[i] = candle
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"candles": candles,
		},
	})
}

// parseDate parses date string in yyyy-mm-dd or yyyy-mm-dd hh:mm:ss format
func parseDate(dateStr string) (time.Time, error) {
	// Try with time first
	if t, err := time.Parse("2006-01-02 15:04:05", dateStr); err == nil {
		return t, nil
	}
	// Try date only
	if t, err := time.Parse("2006-01-02", dateStr); err == nil {
		return t, nil
	}
	// Try with timezone
	if t, err := time.Parse("2006-01-02T15:04:05-0700", dateStr); err == nil {
		return t, nil
	}
	// Final attempt - return the error from parsing
	return time.Parse("2006-01-02", dateStr)
}
