package options

import (
	"fmt"
	"log"
	"sort"
	"strings"
	"sync"
	"time"

	kiteconnect "gokiteconnect-master"
)

// Scanner scans and filters option instruments from Kite Connect
type Scanner struct {
	kiteClient  *kiteconnect.Client
	instruments map[uint32]*OptionInstrument          // token -> instrument
	chains      map[string]map[time.Time]*OptionChain // underlying -> expiry -> chain
	mu          sync.RWMutex
}

// NewScanner creates a new option scanner
func NewScanner(kiteClient *kiteconnect.Client) *Scanner {
	return &Scanner{
		kiteClient:  kiteClient,
		instruments: make(map[uint32]*OptionInstrument),
		chains:      make(map[string]map[time.Time]*OptionChain),
	}
}

var ist, _ = time.LoadLocation("Asia/Kolkata")

func normalize(t time.Time) time.Time {
    t = t.In(ist)
    return time.Date(
        t.Year(), t.Month(), t.Day(),
        0, 0, 0, 0,
        ist,
    )
}

// ScanInstruments fetches all instruments and filters for options
func (s *Scanner) ScanInstruments() error {
	log.Println("Scanning for option instruments...")

	// Fetch all instruments from Kite Connect
	allInstruments, err := s.kiteClient.GetInstruments()
	if err != nil {
		return fmt.Errorf("failed to fetch instruments: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Clear existing data
	s.instruments = make(map[uint32]*OptionInstrument)
	s.chains = make(map[string]map[time.Time]*OptionChain)

	optionCount := 0
	log.Println(allInstruments[0])
	// Filter for options (CE or PE)
	for _, inst := range allInstruments {
		if inst.InstrumentType == "CE" || inst.InstrumentType == "PE" {
			optInst := &OptionInstrument{
				InstrumentToken: uint32(inst.InstrumentToken),
				ExchangeToken:   uint32(inst.ExchangeToken),
				Tradingsymbol:   inst.Tradingsymbol,
				Name:            inst.Name,
				Exchange:        inst.Exchange,
				Segment:         inst.Segment,
				InstrumentType:  OptionType(inst.InstrumentType),
				StrikePrice:     inst.StrikePrice,
				Expiry:          normalize(inst.Expiry.Time),//2026-02-24 00:00:00 +0530 IST
				TickSize:        inst.TickSize,
				LotSize:         int(inst.LotSize),
				LastPrice:       inst.LastPrice,
			}
			
			
			s.instruments[optInst.InstrumentToken] = optInst
			optionCount++

			// Build option chain structure
			// underlying := s.extractUnderlying(inst.Tradingsymbol)
			underlying := inst.Name
			if underlying == "" {
				continue
			}

			if s.chains[underlying] == nil {
				s.chains[underlying] = make(map[time.Time]*OptionChain)
			}

			expiry := normalize(inst.Expiry.Time)
			if s.chains[underlying][expiry] == nil {
				s.chains[underlying][expiry] = &OptionChain{
					Underlying:  underlying,
					Expiry:      expiry,
					Strikes:     make(map[float64]*StrikeData),
					LastUpdated: time.Now(),
				}
			}

			chain := s.chains[underlying][expiry]
			if chain.Strikes[inst.StrikePrice] == nil {
				chain.Strikes[inst.StrikePrice] = &StrikeData{
					Strike:      inst.StrikePrice,
					LastUpdated: time.Now(),
				}
			}

			strikeData := chain.Strikes[inst.StrikePrice]
			optData := &OptionData{
				InstrumentToken: optInst.InstrumentToken,
				Tradingsymbol:   optInst.Tradingsymbol,
				Type:            optInst.InstrumentType,
				Strike:          optInst.StrikePrice,
				Expiry:          optInst.Expiry,
				LastPrice:       optInst.LastPrice,
			}

			if inst.InstrumentType == "CE" {
				strikeData.Call = optData
			} else {
				strikeData.Put = optData
			}
		}
	}
	
	var IST, _ = time.LoadLocation("Asia/Kolkata")
	fmt.Println(s.chains["NIFTY"][normalize(time.Date(2025, 12, 30, 0, 0, 0, 0, IST))].Strikes[26000].Call.Tradingsymbol) // 2025-12-30 00:00:00 +0530 IST

	log.Printf("Found %d option instruments", optionCount)
	log.Printf("Built option chains for %d underlyings", len(s.chains))

	return nil
}

// extractUnderlying extracts underlying symbol from option trading symbol
// Examples: "NIFTY25JAN24500CE" -> "NIFTY"
//
//	"RELIANCE25JAN24500CE" -> "RELIANCE"
func (s *Scanner) extractUnderlying(tradingSymbol string) string {
	// Option symbols typically end with: STRIKEPRICETYPE (e.g., "24500CE")
	// We need to find where the strike price starts (usually 5 digits)

	// Try to find the pattern: digits followed by CE or PE
	for i := len(tradingSymbol) - 1; i >= 0; i-- {
		if tradingSymbol[i] == 'C' || tradingSymbol[i] == 'P' {
			if i+1 < len(tradingSymbol) &&
				(tradingSymbol[i+1] == 'E' || tradingSymbol[i+1] == ' ') {
				// Found CE or PE, extract everything before
				// But we need to remove the strike price too
				// Strike is usually 5 digits before CE/PE
				if i >= 5 {
					// Check if previous 5 chars are digits
					potentialStrike := tradingSymbol[i-5 : i]
					allDigits := true
					for _, c := range potentialStrike {
						if c < '0' || c > '9' {
							allDigits = false
							break
						}
					}
					if allDigits {
						return tradingSymbol[:i-5]
					}
				}
				// Fallback: return everything before CE/PE
				return tradingSymbol[:i]
			}
		}
	}

	// Fallback: try to extract by common patterns
	// NIFTY, BANKNIFTY, FINNIFTY are common
	if strings.HasPrefix(tradingSymbol, "NIFTY") {
		return "NIFTY"
	}
	if strings.HasPrefix(tradingSymbol, "BANKNIFTY") {
		return "BANKNIFTY"
	}
	if strings.HasPrefix(tradingSymbol, "FINNIFTY") {
		return "FINNIFTY"
	}

	return ""
}

// GetInstrument returns option instrument by token
func (s *Scanner) GetInstrument(token uint32) (*OptionInstrument, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	inst, ok := s.instruments[token]
	return inst, ok
}

// GetOptionChain returns option chain for underlying and expiry
func (s *Scanner) GetOptionChain(underlying string, expiry time.Time) (*OptionChain, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.chains[underlying] == nil {
		return nil, false
	}

	chain, ok := s.chains[underlying][expiry]
	return chain, ok
}

// GetUnderlyings returns list of all underlyings
func (s *Scanner) GetUnderlyings() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	underlyings := make([]string, 0, len(s.chains))
	for u := range s.chains {
		underlyings = append(underlyings, u)
	}

	sort.Strings(underlyings)
	return underlyings
}

// GetExpiries returns list of expiries for an underlying
func (s *Scanner) GetExpiries(underlying string) []time.Time {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.chains[underlying] == nil {
		return nil
	}

	expiries := make([]time.Time, 0, len(s.chains[underlying]))
	for expiry := range s.chains[underlying] {
		expiries = append(expiries, expiry)
	}

	sort.Slice(expiries, func(i, j int) bool {
		return expiries[i].Before(expiries[j])
	})

	return expiries
}

// GetTokensForUnderlying returns all option tokens for an underlying
func (s *Scanner) GetTokensForUnderlying(underlying string) []uint32 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	tokens := make([]uint32, 0)

	for _, expiryChains := range s.chains {
		for _, chain := range expiryChains {
			if chain.Underlying == underlying {
				for _, strikeData := range chain.Strikes {
					if strikeData.Call != nil {
						tokens = append(tokens, strikeData.Call.InstrumentToken)
					}
					if strikeData.Put != nil {
						tokens = append(tokens, strikeData.Put.InstrumentToken)
					}
				}
			}
		}
	}

	return tokens
}

// GetTokensForExpiry returns all option tokens for a specific underlying and expiry
func (s *Scanner) GetTokensForExpiry(underlying string, expiry time.Time) []uint32 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.chains[underlying] == nil {
		return nil
	}

	chain, ok := s.chains[underlying][expiry]
	if !ok {
		return nil
	}

	tokens := make([]uint32, 0, len(chain.Strikes)*2)

	for _, strikeData := range chain.Strikes {
		if strikeData.Call != nil {
			tokens = append(tokens, strikeData.Call.InstrumentToken)
		}
		if strikeData.Put != nil {
			tokens = append(tokens, strikeData.Put.InstrumentToken)
		}
	}

	return tokens
}

// FilterOptions filters options based on criteria
type FilterCriteria struct {
	Underlying      string
	Expiry          *time.Time // nil = all expiries
	MinStrike       *float64
	MaxStrike       *float64
	OptionType      *OptionType // nil = both CE and PE
	MinDaysToExpiry int
	MaxDaysToExpiry int
}

// FilterOptions returns tokens matching the filter criteria
func (s *Scanner) FilterOptions(criteria FilterCriteria) []uint32 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	tokens := make([]uint32, 0)
	now := time.Now()

	fmt.Println(criteria)

	

	for token, inst := range s.instruments {
		// Filter by underlying
		underlying := inst.Name
		if criteria.Underlying != "" && underlying != criteria.Underlying {
			continue
		}

		// Filter by expiry
		if criteria.Expiry != nil && !inst.Expiry.Equal(normalize(*criteria.Expiry)) {
			continue
		}

		// Filter by strike
		if criteria.MinStrike != nil && inst.StrikePrice < *criteria.MinStrike {
			continue
		}
		if criteria.MaxStrike != nil && inst.StrikePrice > *criteria.MaxStrike {
			continue
		}

		// Filter by option type
		if criteria.OptionType != nil && inst.InstrumentType != *criteria.OptionType {
			continue
		}

		// Filter by days to expiry
		daysToExpiry := int(inst.Expiry.Sub(now).Hours() / 24)		
		if criteria.MinDaysToExpiry > 0 && daysToExpiry < criteria.MinDaysToExpiry {
			continue
		}
		if criteria.MaxDaysToExpiry > 0 && daysToExpiry > criteria.MaxDaysToExpiry {
			continue
		}

		tokens = append(tokens, token)
	}

	return tokens
}

// GetAllTokens returns all option tokens
func (s *Scanner) GetAllTokens() []uint32 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	tokens := make([]uint32, 0, len(s.instruments))
	for token := range s.instruments {
		tokens = append(tokens, token)
	}

	return tokens
}

// GetUnderlyingFromInstrument extracts underlying symbol from an option instrument
func (s *Scanner) GetUnderlyingFromInstrument(inst *OptionInstrument) string {
	return s.extractUnderlying(inst.Tradingsymbol)
}
