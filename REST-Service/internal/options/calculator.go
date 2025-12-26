package options

import (
	"rest-service/internal/store"
)

// Calculator wraps GreeksCalculator and provides high-level methods
type Calculator struct {
	greeksCalc *GreeksCalculator
	scanner    *Scanner
}

// NewCalculator creates a new calculator instance
func NewCalculator(scanner *Scanner, riskFreeRate float64) *Calculator {
	return &Calculator{
		greeksCalc: NewGreeksCalculator(riskFreeRate),
		scanner:    scanner,
	}
}

// CalculateAllGreeks calculates all Greeks and IV for an option
// It automatically fetches underlying price from the store
func (c *Calculator) CalculateAllGreeks(optionData *OptionData, chain *OptionChain) {
	//fmt.Println("Calculating Greeks for ", optionData.Tradingsymbol, " Chain: ", chain.Underlying)
	if optionData == nil || chain == nil {
		return
	}

	// Try to get from store
	underlyingPrice, ok := store.GlobalStore.GetLTP(chain.UnderlyingToken)
	if !ok {
		return
	}
	chain.UnderlyingPrice = underlyingPrice // Update chain

	// Calculate time to expiry in years
	timeToExpiry := CalculateTimeToExpiry(optionData.Expiry)
	if timeToExpiry <= 0 {
		return
	}

	// Use mid price (average of bid and ask) or last price
	optionPrice := optionData.LastPrice
	if optionData.BidPrice > 0 && optionData.AskPrice > 0 {
		optionPrice = (optionData.BidPrice + optionData.AskPrice) / 2.0
	}

	if optionPrice <= 0 {
		return
	}

	// Calculate IV first (using market price)
	iv := c.greeksCalc.CalculateIV(
		optionPrice,
		underlyingPrice,
		optionData.Strike,
		timeToExpiry,
		optionData.Type,
	)

	optionData.IV = iv

	// Calculate Greeks using the calculated IV
	if iv > 0 {
		delta, gamma, theta, vega := c.greeksCalc.CalculateGreeks(
			optionData.Type,
			underlyingPrice,
			optionData.Strike,
			timeToExpiry,
			iv,
		)

		optionData.Delta = delta
		optionData.Gamma = gamma
		optionData.Theta = theta
		optionData.Vega = vega
	}

	// Calculate intrinsic and time value
	intrinsic, timeValue := c.greeksCalc.CalculateIntrinsicAndTimeValue(
		optionPrice,
		underlyingPrice,
		optionData.Strike,
		optionData.Type,
	)

	optionData.IntrinsicValue = intrinsic
	optionData.TimeValue = timeValue
}
