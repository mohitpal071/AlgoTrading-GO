package store

import (
	"sync"

	"gokiteconnect-master/models"
)

// TickStore holds the latest ticks in memory
type TickStore struct {
	ticks sync.Map
}

// Global instance
var GlobalStore = &TickStore{}

// Update processes a binary tick and updates the store
func (s *TickStore) Update(tickBytes []byte) {
	// Ideally we parse this.
	// Since we now have access to the parser in internal/ticker, we could expose it.
	// OR we use UpdateFromTick which is cleaner if we use OnTick callback.
	// For now, let's just assume main.go will call UpdateFromTick if it gets a struct,
	// or we can try to parse it here if we expose ParsePacket.
}

// UpdateFromTick updates the store with a structured tick
func (s *TickStore) UpdateFromTick(tick models.Tick) {
	s.ticks.Store(tick.InstrumentToken, tick)
}

// Get returns the tick for a given token
func (s *TickStore) Get(token uint32) (models.Tick, bool) {
	val, ok := s.ticks.Load(token)
	if !ok {
		return models.Tick{}, false
	}

	return val.(models.Tick), true
}

// GetAll returns all stored ticks
func (s *TickStore) GetAll() map[uint32]models.Tick {
	result := make(map[uint32]models.Tick)
	s.ticks.Range(func(key, value interface{}) bool {
		result[key.(uint32)] = value.(models.Tick)
		return true
	})
	return result
}
