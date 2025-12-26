package options

import (
	"math"
	"time"
)

// GreeksCalculator calculates option Greeks using Black-Scholes model
type GreeksCalculator struct {
	riskFreeRate float64 // Risk-free interest rate (annual, e.g., 0.06 for 6%)
}

// NewGreeksCalculator creates a new Greeks calculator
// riskFreeRate: Annual risk-free rate (default: 0.06 for 6%)
func NewGreeksCalculator(riskFreeRate float64) *GreeksCalculator {
	if riskFreeRate == 0 {
		riskFreeRate = 0.06 // Default 6% risk-free rate
	}
	return &GreeksCalculator{
		riskFreeRate: riskFreeRate,
	}
}

// CalculateGreeks calculates all Greeks for an option
// underlyingPrice: Current price of the underlying asset
// Returns: delta, gamma, theta, vega, or error
func (gc *GreeksCalculator) CalculateGreeks(
	optionType OptionType,
	underlyingPrice float64,
	strike float64,
	timeToExpiry float64, // in years
	iv float64, // Implied Volatility (annual, e.g., 0.20 for 20%)
) (delta, gamma, theta, vega float64) {
	if underlyingPrice <= 0 || strike <= 0 || timeToExpiry <= 0 || iv <= 0 {
		return 0, 0, 0, 0
	}

	// Calculate d1 and d2 for Black-Scholes
	d1, d2 := gc.calculateD1D2(underlyingPrice, strike, timeToExpiry, iv)

	// Calculate standard normal CDF
	nd1 := gc.normCDF(d1)
	nd2 := gc.normCDF(d2)
	nd2Neg := gc.normCDF(-d2)

	// Calculate PDF (probability density function)
	pdfD1 := gc.normPDF(d1)

	// Calculate Greeks
	if optionType == Call {
		delta = nd1
		theta = (-(underlyingPrice * pdfD1 * iv) / (2 * math.Sqrt(timeToExpiry))) -
			(gc.riskFreeRate * strike * math.Exp(-gc.riskFreeRate*timeToExpiry) * nd2)
	} else { // Put
		delta = nd1 - 1
		theta = (-(underlyingPrice * pdfD1 * iv) / (2 * math.Sqrt(timeToExpiry))) +
			(gc.riskFreeRate * strike * math.Exp(-gc.riskFreeRate*timeToExpiry) * nd2Neg)
	}

	// Gamma is the same for calls and puts
	gamma = pdfD1 / (underlyingPrice * iv * math.Sqrt(timeToExpiry))

	// Vega is the same for calls and puts
	vega = underlyingPrice * pdfD1 * math.Sqrt(timeToExpiry) / 100 // Divide by 100 for percentage

	// Convert theta to per day (from per year)
	theta = theta / 365.0

	return delta, gamma, theta, vega
}

// calculateD1D2 calculates d1 and d2 for Black-Scholes formula
func (gc *GreeksCalculator) calculateD1D2(S, K, T, sigma float64) (d1, d2 float64) {
	d1 = (math.Log(S/K) + (gc.riskFreeRate+0.5*sigma*sigma)*T) / (sigma * math.Sqrt(T))
	d2 = d1 - sigma*math.Sqrt(T)
	return d1, d2
}

// CalculateIV calculates Implied Volatility using Newton-Raphson method
// optionPrice: Current market price of the option
// underlyingPrice: Current price of the underlying asset
// strike: Strike price
// timeToExpiry: Time to expiry in years
// optionType: Call or Put
// Returns: Implied Volatility (annual)
func (gc *GreeksCalculator) CalculateIV(
	optionPrice float64,
	underlyingPrice float64,
	strike float64,
	timeToExpiry float64,
	optionType OptionType,
) float64 {
	if optionPrice <= 0 || underlyingPrice <= 0 || strike <= 0 || timeToExpiry <= 0 {
		return 0
	}

	// Initial guess for IV (start with 20%)
	iv := 0.20
	maxIterations := 100
	tolerance := 0.0001

	for i := 0; i < maxIterations; i++ {
		// Calculate theoretical price with current IV
		theoreticalPrice := gc.blackScholesPrice(underlyingPrice, strike, timeToExpiry, iv, optionType)

		// Calculate vega (sensitivity to volatility)
		d1, _ := gc.calculateD1D2(underlyingPrice, strike, timeToExpiry, iv)
		vega := underlyingPrice * gc.normPDF(d1) * math.Sqrt(timeToExpiry) / 100

		// Avoid division by zero
		if math.Abs(vega) < 0.0001 {
			break
		}

		// Newton-Raphson update
		priceDiff := theoreticalPrice - optionPrice
		ivNew := iv - priceDiff/vega

		// Ensure IV stays positive
		if ivNew < 0 {
			ivNew = 0.01
		}

		// Check convergence
		if math.Abs(ivNew-iv) < tolerance {
			return ivNew
		}

		iv = ivNew
	}

	return iv
}

// blackScholesPrice calculates theoretical option price using Black-Scholes
func (gc *GreeksCalculator) blackScholesPrice(
	S, K, T, sigma float64,
	optionType OptionType,
) float64 {
	d1, d2 := gc.calculateD1D2(S, K, T, sigma)

	if optionType == Call {
		return S*gc.normCDF(d1) - K*math.Exp(-gc.riskFreeRate*T)*gc.normCDF(d2)
	} else { // Put
		return K*math.Exp(-gc.riskFreeRate*T)*gc.normCDF(-d2) - S*gc.normCDF(-d1)
	}
}

// normCDF calculates the cumulative distribution function of the standard normal distribution
func (gc *GreeksCalculator) normCDF(x float64) float64 {
	return 0.5 * (1 + gc.erf(x/math.Sqrt2))
}

// normPDF calculates the probability density function of the standard normal distribution
func (gc *GreeksCalculator) normPDF(x float64) float64 {
	return (1.0 / math.Sqrt(2*math.Pi)) * math.Exp(-0.5*x*x)
}

// erf calculates the error function approximation
func (gc *GreeksCalculator) erf(x float64) float64 {
	// Abramowitz and Stegun approximation
	a1 := 0.254829592
	a2 := -0.284496736
	a3 := 1.421413741
	a4 := -1.453152027
	a5 := 1.061405429
	p := 0.3275911

	sign := 1.0
	if x < 0 {
		sign = -1.0
	}
	x = math.Abs(x)

	t := 1.0 / (1.0 + p*x)
	y := 1.0 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*math.Exp(-x*x)

	return sign * y
}

// CalculateIntrinsicAndTimeValue calculates intrinsic and time value
func (gc *GreeksCalculator) CalculateIntrinsicAndTimeValue(
	optionPrice float64,
	underlyingPrice float64,
	strike float64,
	optionType OptionType,
) (intrinsicValue, timeValue float64) {
	if optionType == Call {
		intrinsicValue = math.Max(0, underlyingPrice-strike)
	} else { // Put
		intrinsicValue = math.Max(0, strike-underlyingPrice)
	}

	timeValue = optionPrice - intrinsicValue
	if timeValue < 0 {
		timeValue = 0
	}

	return intrinsicValue, timeValue
}

// CalculateTimeToExpiry calculates time to expiry in years
func CalculateTimeToExpiry(expiry time.Time) float64 {
	now := time.Now()
	if expiry.Before(now) {
		return 0
	}
	duration := expiry.Sub(now)
	return duration.Hours() / (365.0 * 24.0)
}
