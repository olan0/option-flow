// Black-Scholes Option Pricing Model Implementation

// Standard normal cumulative distribution function
function normalCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  // Save the sign of x
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x) / Math.sqrt(2.0);

  // A&S formula 7.1.26
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// Standard normal probability density function
function normalPDF(x) {
  return (1.0 / Math.sqrt(2.0 * Math.PI)) * Math.exp(-0.5 * x * x);
}

// Black-Scholes option pricing formula
export function calculateBlackScholesPrice({
  S, // Current price of underlying asset
  K, // Strike price
  T, // Time to expiration (in years)
  r = 0.05, // Risk-free interest rate (default 5%)
  sigma, // Implied volatility (as decimal, e.g., 0.25 for 25%)
  optionType = 'call' // 'call' or 'put'
}) {
  // Handle edge cases
  if (T <= 0) {
    // Option has expired, return intrinsic value
    if (optionType === 'call') {
      return Math.max(0, S - K);
    } else {
      return Math.max(0, K - S);
    }
  }

  if (sigma <= 0) {
    // No volatility, return intrinsic value
    if (optionType === 'call') {
      return Math.max(0, S - K);
    } else {
      return Math.max(0, K - S);
    }
  }

  // Calculate d1 and d2
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  // Calculate option price
  if (optionType === 'call') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  }
}

// Calculate option Greeks
export function calculateGreeks({
  S, // Current price of underlying asset
  K, // Strike price
  T, // Time to expiration (in years)
  r = 0.05, // Risk-free interest rate
  sigma, // Implied volatility
  optionType = 'call'
}) {
  if (T <= 0 || sigma <= 0) {
    return {
      delta: 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0
    };
  }

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  const nd1 = normalPDF(d1);

  let delta, gamma, theta, vega, rho;

  if (optionType === 'call') {
    // Call option Greeks
    delta = Nd1;
    gamma = nd1 / (S * sigma * Math.sqrt(T));
    theta = -(S * nd1 * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * Nd2;
    vega = S * nd1 * Math.sqrt(T);
    rho = K * T * Math.exp(-r * T) * Nd2;
  } else {
    // Put option Greeks
    delta = Nd1 - 1;
    gamma = nd1 / (S * sigma * Math.sqrt(T));
    theta = -(S * nd1 * sigma) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * normalCDF(-d2);
    vega = S * nd1 * Math.sqrt(T);
    rho = -K * T * Math.exp(-r * T) * normalCDF(-d2);
  }

  return {
    delta: delta,
    gamma: gamma,
    theta: theta / 365, // Convert to per-day
    vega: vega / 100, // Convert to per 1% volatility change
    rho: rho / 100 // Convert to per 1% interest rate change
  };
}

// Calculate implied volatility using Newton-Raphson method
export function calculateImpliedVolatility({
  S, // Current price of underlying asset
  K, // Strike price
  T, // Time to expiration (in years)
  r = 0.05, // Risk-free interest rate
  marketPrice, // Observed market price of option
  optionType = 'call',
  initialGuess = 0.3, // Initial volatility guess (30%)
  tolerance = 0.0001, // Convergence tolerance
  maxIterations = 100
}) {
  let sigma = initialGuess;
  
  for (let i = 0; i < maxIterations; i++) {
    const price = calculateBlackScholesPrice({ S, K, T, r, sigma, optionType });
    const vega = calculateGreeks({ S, K, T, r, sigma, optionType }).vega * 100; // Convert back to full vega
    
    const diff = price - marketPrice;
    
    if (Math.abs(diff) < tolerance) {
      return sigma;
    }
    
    if (vega === 0) {
      break; // Avoid division by zero
    }
    
    sigma = sigma - diff / vega;
    
    // Keep sigma within reasonable bounds
    sigma = Math.max(0.001, Math.min(5.0, sigma));
  }
  
  return sigma; // Return best estimate even if not converged
}

// Utility function to convert days to years
export function daysToYears(days) {
  return days / 365.25;
}

// Utility function to get current market data and calculate option price
export function calculateOptionPrice({
  underlyingPrice,
  strikePrice,
  daysToExpiration,
  impliedVolatility, // As percentage (e.g., 45 for 45%)
  optionType,
  riskFreeRate = 0.05
}) {
  const S = underlyingPrice;
  const K = strikePrice;
  const T = daysToYears(daysToExpiration);
  const sigma = impliedVolatility / 100; // Convert percentage to decimal
  const r = riskFreeRate;

  return calculateBlackScholesPrice({ S, K, T, r, sigma, optionType });
}