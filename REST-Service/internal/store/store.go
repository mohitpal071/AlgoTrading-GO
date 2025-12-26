package store

import (
	"sync"
	"sync/atomic"

	"gokiteconnect-master/models"
)

// TickStore holds the latest ticks in memory using atomic values for lock-free reads/writes on existing keys
type TickStore struct {
	mu    sync.RWMutex
	ticks map[uint32]*atomic.Value
}

// Global instance
var GlobalStore = New()

func New() *TickStore {
	return &TickStore{
		ticks: make(map[uint32]*atomic.Value),
	}
}

// Update processes a binary tick and updates the store
func (s *TickStore) Update(tickBytes []byte) {
	// Not implemented for binary yet, waiting for main.go to push updates
}

// UpdateFromTick updates the store with a structured tick
// This method is optimized to be virtually lock-free for existing tokens
func (s *TickStore) UpdateFromTick(tick models.Tick) {
	// Fast path: Try to get value with separate read lock
	s.mu.RLock()
	val, ok := s.ticks[tick.InstrumentToken]
	s.mu.RUnlock()

	if ok {
		// Wait-free atomic store
		val.Store(tick)
		return
	}

	// Slow path: New token, need write lock
	s.mu.Lock()
	// Double check
	val, ok = s.ticks[tick.InstrumentToken]
	if !ok {
		val = &atomic.Value{}
		s.ticks[tick.InstrumentToken] = val
	}
	s.mu.Unlock()

	// Store value
	val.Store(tick)
}

// Get returns the tick for a given token
// This method is optimized to be virtually lock-free
func (s *TickStore) Get(token uint32) (models.Tick, bool) {
	s.mu.RLock()
	val, ok := s.ticks[token]
	s.mu.RUnlock()

	if !ok {
		return models.Tick{}, false
	}

	// Wait-free atomic load
	x := val.Load()
	if x == nil {
		return models.Tick{}, false
	}
	return x.(models.Tick), true
}


// GetLTP returns the Last Price for a given token
// This method is optimized to be virtually lock-free
func (s *TickStore) GetLTP(token uint32) (float64, bool) {
	s.mu.RLock()
	val, ok := s.ticks[token]
	s.mu.RUnlock()

	if !ok {
		return 0, false
	}

	// Wait-free atomic load
	x := val.Load()
	if x == nil {
		return 0, false
	}
	return x.(models.Tick).LastPrice, true
}

// GetAll returns all stored ticks
func (s *TickStore) GetAll() map[uint32]models.Tick {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make(map[uint32]models.Tick, len(s.ticks))
	for token, val := range s.ticks {
		x := val.Load()
		if x != nil {
			result[token] = x.(models.Tick)
		}
	}
	return result
}
