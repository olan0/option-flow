// Uniswap-style AMM Pricing for Options
import { calculateOptionPrice, calculateGreeks } from "./BlackScholesCalculator";

// Calculate AMM price impact based on trade size and liquidity
export function calculateAmmPriceImpact({
  tradeSize, // Number of contracts
  poolLiquidity, // Total liquidity in aeUSDC
  basePrice, // Black-Scholes theoretical price
  side = 'buy' // 'buy' or 'sell'
}) {
  // Handle edge cases
  if (!tradeSize || !poolLiquidity || !basePrice) return 1;
  
  try {
    // Convert trade size to aeUSDC value
    const tradeValue = tradeSize * basePrice;
    
    // Price impact formula similar to Uniswap v2: x * y = k
    // Impact increases non-linearly with trade size
    const liquidityRatio = tradeValue / poolLiquidity;
    
    // Base price impact (similar to Uniswap's 0.3% fee)
    const baseFee = 0.003;
    
    // Dynamic price impact based on trade size
    // Larger trades get exponentially higher impact
    const dynamicImpact = Math.pow(liquidityRatio, 1.5) * 0.1;
    
    // Total impact
    const totalImpact = baseFee + dynamicImpact;
    
    // Apply impact differently for buy vs sell
    if (side === 'buy') {
      return 1 + totalImpact; // Increase price for buys
    } else {
      return 1 - totalImpact; // Decrease price for sells
    }
  } catch (error) {
    console.error('Error calculating price impact:', error);
    return 1;
  }
}

// Calculate bid-ask spread based on pool conditions
export function calculateDynamicSpread({
  poolLiquidity = 1000000,
  totalVolume = 50000,
  impliedVolatility = 45,
  timeToExpiration = 30,
  baseSpread = 0.02 // 2% base spread
}) {
  try {
    // Factors that increase spread:
    
    // 1. Low liquidity increases spread
    const liquidityFactor = Math.max(0.5, Math.min(2.0, 1000000 / poolLiquidity));
    
    // 2. High volatility increases spread
    const volatilityFactor = 1 + (impliedVolatility / 100) * 0.3;
    
    // 3. Low time to expiration increases spread (gamma risk)
    const timeFactor = Math.max(1.0, Math.min(3.0, 30 / Math.max(1, timeToExpiration)));
    
    // 4. Low volume increases spread
    const volumeFactor = Math.max(0.8, Math.min(1.5, 100000 / Math.max(1000, totalVolume)));
    
    // Calculate total spread
    const dynamicSpread = baseSpread * liquidityFactor * volatilityFactor * timeFactor * volumeFactor;
    
    // Cap the spread at reasonable levels
    return Math.max(0.01, Math.min(0.15, dynamicSpread)); // 1% to 15%
  } catch (error) {
    console.error('Error calculating dynamic spread:', error);
    return baseSpread;
  }
}

// Main AMM pricing function that combines Black-Scholes with AMM mechanics
export function calculateAmmOptionPrice({
  underlyingPrice = 50000,
  strikePrice = 55000,
  daysToExpiration = 30,
  impliedVolatility = 45,
  optionType = 'call',
  poolLiquidity = 1000000,
  totalVolume = 50000,
  tradeSize = 1,
  side = 'buy',
  riskFreeRate = 0.05
}) {
  try {
    // Start with Black-Scholes theoretical price
    const theoreticalPrice = calculateOptionPrice({
      underlyingPrice,
      strikePrice,
      daysToExpiration,
      impliedVolatility,
      optionType,
      riskFreeRate
    }) || 0;
    
    // Calculate dynamic spread based on pool conditions
    const spread = calculateDynamicSpread({
      poolLiquidity,
      totalVolume,
      impliedVolatility,
      timeToExpiration: daysToExpiration
    });
    
    // Calculate mid price (theoretical)
    const midPrice = theoreticalPrice;
    
    // Calculate bid and ask prices
    const halfSpread = spread / 2;
    let bidPrice = midPrice * (1 - halfSpread);
    let askPrice = midPrice * (1 + halfSpread);
    
    // Apply AMM price impact based on trade size
    const priceImpactMultiplier = calculateAmmPriceImpact({
      tradeSize,
      poolLiquidity,
      basePrice: midPrice,
      side
    });
    
    // Adjust prices based on trade side and size
    if (side === 'buy') {
      // Buying pushes ask price higher
      askPrice = askPrice * priceImpactMultiplier;
      return {
        price: Math.max(0, askPrice),
        midPrice: Math.max(0, midPrice),
        bidPrice: Math.max(0, bidPrice),
        askPrice: Math.max(0, askPrice),
        spread: spread * 100, // Return as percentage
        priceImpact: (priceImpactMultiplier - 1) * 100,
        theoreticalPrice: Math.max(0, theoreticalPrice)
      };
    } else {
      // Selling pushes bid price lower
      bidPrice = bidPrice * priceImpactMultiplier;
      return {
        price: Math.max(0, bidPrice),
        midPrice: Math.max(0, midPrice),
        bidPrice: Math.max(0, bidPrice),
        askPrice: Math.max(0, askPrice),
        spread: spread * 100,
        priceImpact: (1 - priceImpactMultiplier) * 100,
        theoreticalPrice: Math.max(0, theoreticalPrice)
      };
    }
  } catch (error) {
    console.error('Error calculating AMM option price:', error);
    return {
      price: 0,
      midPrice: 0,
      bidPrice: 0,
      askPrice: 0,
      spread: 5,
      priceImpact: 0,
      theoreticalPrice: 0
    };
  }
}

// Calculate liquidity provider rewards based on volume and fees
export function calculateLpRewards({
  liquidityProvided = 0,
  totalPoolLiquidity = 1000000,
  totalVolume = 50000,
  feeRate = 0.003 // 0.3% fee
}) {
  try {
    // LP's share of the pool
    const poolShare = totalPoolLiquidity > 0 ? liquidityProvided / totalPoolLiquidity : 0;
    
    // Total fees collected
    const totalFees = totalVolume * feeRate;
    
    // LP's share of fees
    const lpFees = totalFees * poolShare;
    
    // Calculate APY based on fees earned
    const apy = liquidityProvided > 0 ? (lpFees / liquidityProvided) * (365 / 1) * 100 : 0;
    
    return {
      feesEarned: lpFees || 0,
      poolShare: (poolShare * 100) || 0,
      estimatedApy: Math.min(1000, Math.max(0, apy || 0)) // Cap at 1000% APY
    };
  } catch (error) {
    console.error('Error calculating LP rewards:', error);
    return {
      feesEarned: 0,
      poolShare: 0,
      estimatedApy: 0
    };
  }
}

// Simulate pool state after a trade (for UI predictions)
export function simulateTradeImpact({
  currentPrice = 0,
  tradeSize = 1,
  side = 'buy',
  poolLiquidity = 1000000,
  totalVolume = 50000
}) {
  try {
    const tradeValue = tradeSize * currentPrice;
    
    // Update pool liquidity (simplified)
    let newLiquidity = poolLiquidity;
    if (side === 'buy') {
      newLiquidity += tradeValue * 0.5; // Some of the payment stays in pool
    } else {
      newLiquidity -= tradeValue * 0.5; // Pool pays out some liquidity
    }
    
    // Update volume
    const newVolume = totalVolume + tradeValue;
    
    // Calculate new mid price after trade
    const priceChange = poolLiquidity > 0 ? (tradeValue / poolLiquidity) * (side === 'buy' ? 0.01 : -0.01) : 0;
    const newMidPrice = currentPrice * (1 + priceChange);
    
    return {
      newLiquidity: Math.max(1000, newLiquidity), // Minimum liquidity
      newVolume: newVolume || 0,
      newMidPrice: Math.max(0.01, newMidPrice || 0.01),
      priceChange: (priceChange * 100) || 0 // Return as percentage
    };
  } catch (error) {
    console.error('Error simulating trade impact:', error);
    return {
      newLiquidity: poolLiquidity || 1000000,
      newVolume: totalVolume || 50000,
      newMidPrice: currentPrice || 1,
      priceChange: 0
    };
  }
}

// Calculate slippage for large trades
export function calculateSlippage({
  requestedSize = 1,
  poolLiquidity = 1000000,
  currentPrice = 1,
  maxSlippageTolerance = 0.05 // 5%
}) {
  try {
    const tradeValue = requestedSize * currentPrice;
    const slippageEstimate = poolLiquidity > 0 ? Math.pow(tradeValue / poolLiquidity, 1.2) * 0.1 : 0;
    
    const isSlippageAcceptable = slippageEstimate <= maxSlippageTolerance;
    
    return {
      estimatedSlippage: (slippageEstimate * 100) || 0, // Return as percentage
      isAcceptable: isSlippageAcceptable,
      maxRecommendedSize: isSlippageAcceptable ? requestedSize : 
        Math.floor(Math.pow(maxSlippageTolerance / 0.1, 1/1.2) * poolLiquidity / Math.max(0.01, currentPrice)),
      warning: slippageEstimate > 0.02 ? 'High slippage detected' : null
    };
  } catch (error) {
    console.error('Error calculating slippage:', error);
    return {
      estimatedSlippage: 0,
      isAcceptable: true,
      maxRecommendedSize: requestedSize || 1,
      warning: null
    };
  }
}