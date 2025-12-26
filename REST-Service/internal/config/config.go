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
	FilterCriteria FilterCriteriaConfig `json:"filter_criteria"`
	Subscription   SubscriptionConfig   `json:"subscription"`
}

// FilterCriteriaConfig holds filter criteria for option scanning
type FilterCriteriaConfig struct {
	Underlying      string   `json:"underlying"`
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

	// Set defaults
	if config.Subscription.BatchSize == 0 {
		config.Subscription.BatchSize = 100
	}
	if config.Subscription.BatchDelayMs == 0 {
		config.Subscription.BatchDelayMs = 100
	}

	return &config, nil
}

// ToFilterCriteria converts FilterCriteriaConfig to options.FilterCriteria
func (fc *FilterCriteriaConfig) ToFilterCriteria() (options.FilterCriteria, error) {
	criteria := options.FilterCriteria{
		Underlying:      fc.Underlying,
		MinDaysToExpiry: fc.MinDaysToExpiry,
		MaxDaysToExpiry: fc.MaxDaysToExpiry,
	}

	// Convert OptionType string to *OptionType
	if fc.OptionType != nil {
		optType := options.OptionType(*fc.OptionType)
		if optType != options.Call && optType != options.Put {
			return criteria, fmt.Errorf("invalid option_type: %s (must be CE or PE)", *fc.OptionType)
		}
		criteria.OptionType = &optType
	}

	// Convert Expiry string to *time.Time
	if fc.Expiry != nil && *fc.Expiry != "" {
		expiry, err := time.Parse("2006-01-02", *fc.Expiry)
		if err != nil {
			return criteria, fmt.Errorf("invalid expiry format: %s (must be YYYY-MM-DD)", *fc.Expiry)
		}
		criteria.Expiry = &expiry
	}

	// Copy strike values
	criteria.MinStrike = fc.MinStrike
	criteria.MaxStrike = fc.MaxStrike

	return criteria, nil
}
