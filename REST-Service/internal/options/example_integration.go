package options

// This file shows how to integrate the option scanner with your existing ticker system
// Add this to your main.go or create a separate initialization function

/*
Example integration in main.go:

package main

import (
	"log"
	"os"
	"time"

	"rest-service/internal/options"
	kiteticker "rest-service/internal/ticker"

	kiteconnect "gokiteconnect-master"
)

func initOptionTrading(kc *kiteconnect.Client, ticker *kiteticker.ExtendedTicker) {
	// 1. Create and initialize scanner
	scanner := options.NewScanner(kc)

	// Scan instruments (do this once at startup, or periodically)
	if err := scanner.ScanInstruments(); err != nil {
		log.Fatalf("Failed to scan options: %v", err)
	}

	// 2. Filter options you want to trade
	// Example: NIFTY weekly options, 7-14 days to expiry
	now := time.Now()
	criteria := options.FilterCriteria{
		Underlying:      "NIFTY",
		MinDaysToExpiry:  7,
		MaxDaysToExpiry: 14,
		OptionType:      &options.Put, // Only puts
	}

	tokens := scanner.FilterOptions(criteria)
	log.Printf("Subscribing to %d option tokens", len(tokens))

	// 3. Subscribe to these tokens for market data
	if len(tokens) > 0 {
		// Subscribe in batches (Kite has limits)
		batchSize := 100
		for i := 0; i < len(tokens); i += batchSize {
			end := i + batchSize
			if end > len(tokens) {
				end = len(tokens)
			}
			batch := tokens[i:end]

			if err := ticker.Subscribe(batch); err != nil {
				log.Printf("Error subscribing batch %d-%d: %v", i, end, err)
				continue
			}

			// Set to full mode for complete market data
			if err := ticker.SetFullMode(batch); err != nil {
				log.Printf("Error setting mode for batch %d-%d: %v", i, end, err)
			}

			log.Printf("Subscribed batch %d-%d", i, end)
			time.Sleep(100 * time.Millisecond) // Rate limiting
		}
	}

	// 4. Process ticks and update option chain
	// In your tick handler:
	ticker.OnTick(func(tick models.Tick) {
		// Check if this is an option
		inst, ok := scanner.GetInstrument(tick.InstrumentToken)
		if !ok {
			return // Not an option, skip
		}

		// Get option chain
		underlying := scanner.GetUnderlyingFromInstrument(inst)
		chain, ok := scanner.GetOptionChain(underlying, inst.Expiry)
		if !ok {
			return
		}

		// Update strike data
		strikeData, ok := chain.Strikes[inst.StrikePrice]
		if !ok {
			return
		}

		// Update call or put data
		if inst.InstrumentType == options.Call && strikeData.Call != nil {
			strikeData.Call.UpdateFromTick(tick)
		} else if inst.InstrumentType == options.Put && strikeData.Put != nil {
			strikeData.Put.UpdateFromTick(tick)
		}

		// TODO: Calculate Greeks
		// TODO: Run strategy
		// TODO: Generate signals
	})

	// 5. Refresh scanner daily (new expiries added)
	go func() {
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			log.Println("Refreshing option scanner...")
			if err := scanner.ScanInstruments(); err != nil {
				log.Printf("Error refreshing scanner: %v", err)
			}
		}
	}()
}
*/
