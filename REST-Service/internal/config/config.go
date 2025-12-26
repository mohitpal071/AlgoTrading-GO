package config

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"rest-service/internal/options"
)

// Config holds the application configuration
type Config struct {
	Underlyings  []UnderlyingConfig `json:"underlyings"` // List of underlying configurations
	Subscription SubscriptionConfig `json:"subscription"`
}

// UnderlyingConfig holds filter criteria for a specific underlying
type UnderlyingConfig struct {
	Underlying      string   `json:"underlying"`            // Underlying symbol (e.g., "NIFTY", "DIXON")
	OptionType      *string  `json:"option_type,omitempty"` // "CE", "PE", or empty for both
	Expiry          *string  `json:"expiry,omitempty"`      // "YYYY-MM-DD" format or empty for all
	MinStrike       *float64 `json:"min_strike,omitempty"`
	MaxStrike       *float64 `json:"max_strike,omitempty"`
	MinDaysToExpiry int      `json:"min_days_to_expiry"`
	MaxDaysToExpiry int      `json:"max_days_to_expiry"`
}

// SubscriptionConfig holds subscription settings
type SubscriptionConfig struct {
	BatchSize    int `json:"batch_size"`     // Number of tokens per batch
	BatchDelayMs int `json:"batch_delay_ms"` // Delay between batches in milliseconds
}

// LoadConfig loads configuration from a JSON file
func LoadConfig(configPath string) (*Config, error) {
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	// Validate that at least one underlying is configured
	if len(config.Underlyings) == 0 {
		return nil, fmt.Errorf("at least one underlying must be specified")
	}

	// Validate each underlying config
	for i, uc := range config.Underlyings {
		if uc.Underlying == "" {
			return nil, fmt.Errorf("underlying[%d]: underlying name cannot be empty", i)
		}
		if uc.MinDaysToExpiry < 0 || uc.MaxDaysToExpiry < 0 {
			return nil, fmt.Errorf("underlying[%d] (%s): days to expiry cannot be negative", i, uc.Underlying)
		}
		if uc.MinDaysToExpiry > uc.MaxDaysToExpiry {
			return nil, fmt.Errorf("underlying[%d] (%s): min_days_to_expiry (%d) cannot be greater than max_days_to_expiry (%d)",
				i, uc.Underlying, uc.MinDaysToExpiry, uc.MaxDaysToExpiry)
		}
		if uc.MinStrike != nil && uc.MaxStrike != nil && *uc.MinStrike > *uc.MaxStrike {
			return nil, fmt.Errorf("underlying[%d] (%s): min_strike (%.2f) cannot be greater than max_strike (%.2f)",
				i, uc.Underlying, *uc.MinStrike, *uc.MaxStrike)
		}
	}

	// Set defaults
	if config.Subscription.BatchSize == 0 {
		config.Subscription.BatchSize = 100
	}
	if config.Subscription.BatchDelayMs == 0 {
		config.Subscription.BatchDelayMs = 100
	}

	return &config, nil
}

// ToFilterCriteria converts UnderlyingConfig to options.FilterCriteria
func (uc *UnderlyingConfig) ToFilterCriteria() (options.FilterCriteria, error) {
	criteria := options.FilterCriteria{
		Underlying:      uc.Underlying,
		MinDaysToExpiry: uc.MinDaysToExpiry,
		MaxDaysToExpiry: uc.MaxDaysToExpiry,
	}

	// Convert OptionType string to *OptionType
	if uc.OptionType != nil {
		optType := options.OptionType(*uc.OptionType)
		if optType != options.Call && optType != options.Put {
			return criteria, fmt.Errorf("invalid option_type for %s: %s (must be CE or PE)", uc.Underlying, *uc.OptionType)
		}
		criteria.OptionType = &optType
	}

	// Convert Expiry string to *time.Time
	if uc.Expiry != nil && *uc.Expiry != "" {
		expiry, err := time.Parse("2006-01-02", *uc.Expiry)
		if err != nil {
			return criteria, fmt.Errorf("invalid expiry format for %s: %s (must be YYYY-MM-DD)", uc.Underlying, *uc.Expiry)
		}
		criteria.Expiry = &expiry
	}

	// Copy strike values
	criteria.MinStrike = uc.MinStrike
	criteria.MaxStrike = uc.MaxStrike

	return criteria, nil
}

// GetAllFilterCriteria returns a list of FilterCriteria, one for each underlying configuration
func (c *Config) GetAllFilterCriteria() ([]options.FilterCriteria, error) {
	var allCriteria []options.FilterCriteria

	for _, uc := range c.Underlyings {
		criteria, err := uc.ToFilterCriteria()
		if err != nil {
			return nil, err
		}
		allCriteria = append(allCriteria, criteria)
	}

	return allCriteria, nil
}
