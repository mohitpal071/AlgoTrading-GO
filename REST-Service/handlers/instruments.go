package handlers

import (
	"net/http"
	"sort"

	"rest-service/internal/options"

	"github.com/gin-gonic/gin"
)

// OptimizedInstrumentResponse represents the columnar format for instruments
type OptimizedInstrumentResponse struct {
	Enums  map[string]map[string]int `json:"enums"`
	Schema []string                  `json:"schema"`
	Data   [][]interface{}           `json:"data"`
	Count  int                       `json:"count"`
}

// GetInstruments handles the GET /instruments route
// Returns all instruments in optimized columnar format (schema + rows) with enum compression
// This reduces payload size by ~60% compared to JSON objects
func (ctrl *Controller) GetInstruments(c *gin.Context) {
	if ctrl.Scanner == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Scanner not initialized"})
		return
	}

	instruments, err := ctrl.Scanner.GetAllInstrumentsMap()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Build enum mappings for repeated strings (saves MBs)
	exchangeEnum := make(map[string]int)
	segmentEnum := make(map[string]int)
	instrumentTypeEnum := make(map[string]int)
	exchangeCounter := 1
	segmentCounter := 1
	typeCounter := 1

	// First pass: collect all unique enum values
	for _, inst := range instruments {
		if _, exists := exchangeEnum[inst.Exchange]; !exists {
			exchangeEnum[inst.Exchange] = exchangeCounter
			exchangeCounter++
		}
		if _, exists := segmentEnum[inst.Segment]; !exists {
			segmentEnum[inst.Segment] = segmentCounter
			segmentCounter++
		}
		typeStr := string(inst.InstrumentType)
		if _, exists := instrumentTypeEnum[typeStr]; !exists {
			instrumentTypeEnum[typeStr] = typeCounter
			typeCounter++
		}
	}

	// Define schema (column order)
	schema := []string{
		"InstrumentToken",
		"Tradingsymbol",
		"Name",
		"Exchange",
		"Segment",
		"InstrumentType",
		"TickSize",
		"LotSize",
		"StrikePrice",
		"Expiry",
	}

	// Convert map to sorted slice for consistent ordering
	type instrumentEntry struct {
		token      uint32
		instrument *options.OptionInstrument
	}
	entries := make([]instrumentEntry, 0, len(instruments))
	for token, inst := range instruments {
		entries = append(entries, instrumentEntry{token: token, instrument: inst})
	}
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].token < entries[j].token
	})

	// Build columnar data array
	data := make([][]interface{}, 0, len(instruments))
	for _, entry := range entries {
		inst := entry.instrument
		row := make([]interface{}, len(schema))

		row[0] = inst.InstrumentToken
		row[1] = inst.Tradingsymbol
		row[2] = inst.Name
		row[3] = exchangeEnum[inst.Exchange]                     // Use enum ID instead of string
		row[4] = segmentEnum[inst.Segment]                       // Use enum ID instead of string
		row[5] = instrumentTypeEnum[string(inst.InstrumentType)] // Use enum ID instead of string
		row[6] = inst.TickSize
		row[7] = inst.LotSize
		row[8] = inst.StrikePrice
		row[9] = inst.Expiry.Format("2006-01-02") // Format expiry as YYYY-MM-DD

		data = append(data, row)
	}

	// Build response with enums
	response := OptimizedInstrumentResponse{
		Enums: map[string]map[string]int{
			"Exchange":       exchangeEnum,
			"Segment":        segmentEnum,
			"InstrumentType": instrumentTypeEnum,
		},
		Schema: schema,
		Data:   data,
		Count:  len(data),
	}

	// Set content encoding hint (client can still request gzip via Accept-Encoding)
	c.Header("Content-Type", "application/json")
	c.JSON(http.StatusOK, response)
}
