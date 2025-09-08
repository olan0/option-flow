
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Zap, X, TrendingUp, TrendingDown, Info, ShieldCheck, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { calculateGreeks } from "../utils/BlackScholesCalculator";
import { calculateAmmOptionPrice, calculateSlippage, simulateTradeImpact } from "../utils/AmmPricing";

export default function TradeTicket({ contract, tradeType: initialTradeType, onClose, onTradeComplete, currentPrices }) {
    const [tradeType, setTradeType] = useState(initialTradeType);
    const [quantity, setQuantity] = useState('1');
    const [isExecuting, setIsExecuting] = useState(false);

    const calculatePrice = () => {
        if (!contract || !quantity || !currentPrices) return { 
            price: 0, 
            midPrice: 0, 
            spread: 0, 
            priceImpact: 0, 
            theoreticalPrice: 0, 
            greeks: null, 
            slippage: null, 
            impact: null 
        };
        
        try {
            const underlyingPrice = currentPrices[contract.underlying_asset] || 0;
            if (underlyingPrice === 0) throw new Error("Underlying price is not available.");

            const strikePrice = contract.strike_price || 0;
            const daysToExpiration = Math.max(1, Math.floor(((contract.expiration_timestamp || 0) * 1000 - Date.now()) / (1000 * 60 * 60 * 24)));
            const impliedVolatility = contract.implied_volatility || 45;
            const tradeSize = parseFloat(quantity) || 0;
            
            // Calculate AMM price with dynamic spreads
            const ammPrice = calculateAmmOptionPrice({
                underlyingPrice,
                strikePrice,
                daysToExpiration,
                impliedVolatility,
                optionType: contract.option_type,
                poolLiquidity: contract.total_liquidity || 1000000,
                totalVolume: contract.total_volume || 50000,
                tradeSize,
                side: tradeType
            });
            
            // Calculate Greeks
            const greeks = calculateGreeks({
                S: underlyingPrice,
                K: strikePrice,
                T: daysToExpiration / 365.25,
                sigma: impliedVolatility / 100,
                optionType: contract.option_type,
                r: 0.05
            });
            
            // Calculate slippage
            const slippage = calculateSlippage({
                requestedSize: tradeSize,
                poolLiquidity: contract.total_liquidity || 1000000,
                currentPrice: ammPrice?.midPrice || 0
            });
            
            // Calculate trade impact on pool
            const impact = simulateTradeImpact({
                currentPrice: ammPrice?.midPrice || 0,
                tradeSize,
                side: tradeType,
                poolLiquidity: contract.total_liquidity || 1000000,
                totalVolume: contract.total_volume || 50000
            });
            
            return { 
                price: ammPrice?.price || 0, 
                midPrice: ammPrice?.midPrice || 0,
                spread: ammPrice?.spread || 0,
                priceImpact: ammPrice?.priceImpact || 0,
                theoreticalPrice: ammPrice?.theoreticalPrice || 0,
                greeks, 
                slippage, 
                impact 
            };
        } catch (error) {
            console.error('Error calculating price:', error);
            return { 
                price: 0, 
                midPrice: 0, 
                spread: 0, 
                priceImpact: 0, 
                theoreticalPrice: 0, 
                greeks: null, 
                slippage: null, 
                impact: null 
            };
        }
    };

    const { price: pricePerContract, midPrice, spread, priceImpact, theoreticalPrice, greeks, slippage, impact } = calculatePrice();
    const totalCost = (pricePerContract || 0) * (parseFloat(quantity) || 0);

    // Calculate collateral requirement for selling options
    const calculateCollateralRequired = () => {
        if (tradeType !== 'sell') return 0;
        
        const underlyingPrice = currentPrices[contract?.underlying_asset] || 0;
        const contracts = parseFloat(quantity) || 0;
        
        if (contract?.option_type === 'call') {
            // For covered calls, need to hold the underlying or cash equivalent
            return underlyingPrice * contracts;
        } else {
            // For cash-secured puts, need cash equal to strike * contracts
            return (contract?.strike_price || 0) * contracts;
        }
    };

    const collateralRequired = calculateCollateralRequired();

    const checkUtilization = () => {
      if (tradeType !== 'sell' || !contract) return { isAllowed: true, message: null };
      
      const tradeNotionalValue = (pricePerContract || 0) * (parseFloat(quantity) || 0);
      const currentOpenInterest = contract.total_open_interest || 0;
      const newOpenInterest = currentOpenInterest + tradeNotionalValue;
      const poolLiquidity = contract.total_liquidity || 0;
      const maxOpenInterest = poolLiquidity * (contract.max_open_interest_ratio || 0.8); // Default to 80% if not specified

      if (newOpenInterest > maxOpenInterest) {
        return {
          isAllowed: false,
          message: `This trade exceeds the pool's max utilization (${(contract.max_open_interest_ratio * 100).toFixed(0)}%). Reduce trade size.`
        };
      }
      return { isAllowed: true, message: null };
    };
    
    const utilizationCheck = checkUtilization();

    const handleTrade = async () => {
        if (!contract || !quantity || !utilizationCheck.isAllowed) return;
        
        setIsExecuting(true);
        
        try {
            // Simulate contract interaction delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('Executing AMM trade:', {
                pool: contract.pool_id,
                type: tradeType,
                quantity: parseFloat(quantity),
                pricePerContract,
                midPrice,
                spread,
                priceImpact,
                slippage: slippage?.estimatedSlippage,
                totalCost,
                collateralRequired,
                greeks
            });
            
            onTradeComplete();
            onClose();
        } catch (error) {
            console.error('Trade execution failed:', error);
        }
        
        setIsExecuting(false);
    };

    const daysToExpiration = Math.max(1, Math.floor(((contract?.expiration_timestamp || 0) * 1000 - Date.now()) / (1000 * 60 * 60 * 24)));
    const underlyingPrice = currentPrices[contract?.underlying_asset] || 0;

    // Determine warning level based on slippage and spread
    const getWarningLevel = () => {
        if ((slippage?.estimatedSlippage || 0) > 5 || (spread || 0) > 10) return 'high';
        if ((slippage?.estimatedSlippage || 0) > 2 || (spread || 0) > 5) return 'medium';
        return 'low';
    };

    const warningLevel = getWarningLevel();

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <Card className="bg-slate-800/90 border-slate-700 text-white">
                    <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-slate-700/50">
                        <CardTitle>AMM Options Trade</CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5"/>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        {/* Contract Details */}
                        <div className="p-3 rounded-lg bg-slate-700/50">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className={`font-bold text-lg ${contract?.option_type === 'call' ? 'text-green-400' : 'text-red-400'}`}>
                                    {contract?.underlying_asset} ${(contract?.strike_price || 0).toLocaleString()} {(contract?.option_type || 'UNKNOWN').toUpperCase()}
                                </h3>
                                <Badge className={contract?.option_type === 'call' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                                    {daysToExpiration}d to expiry
                                </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-400">Underlying Price</span>
                                    <p className="text-white font-semibold">${underlyingPrice.toLocaleString()}</p>
                                </div>
                                <div>
                                    <span className="text-slate-400">Pool Liquidity</span>
                                    <p className="text-white font-semibold">${(((contract?.total_liquidity || 0)/1000)).toFixed(0)}k</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Trade Type Selection */}
                        <div className="grid grid-cols-2 gap-2">
                           <Button
                                variant={tradeType === 'buy' ? 'default' : 'outline'}
                                onClick={() => setTradeType('buy')}
                                className={`flex-1 ${tradeType === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'border-slate-600 text-slate-300'}`}
                            >
                                <TrendingUp className="w-4 h-4 mr-2" />
                                Buy to Open
                            </Button>
                           <Button
                                variant={tradeType === 'sell' ? 'default' : 'outline'}
                                onClick={() => setTradeType('sell')}
                                className={`flex-1 ${tradeType === 'sell' ? 'bg-red-600 hover:bg-red-700' : 'border-slate-600 text-slate-300'}`}
                           >
                                <TrendingDown className="w-4 h-4 mr-2" />
                                Sell to Open
                            </Button>
                        </div>
                        
                        {/* Quantity Input */}
                        <div className="space-y-1">
                            <Label htmlFor="quantity" className="text-slate-300">Contracts</Label>
                            <Input 
                                id="quantity" 
                                type="number" 
                                value={quantity} 
                                onChange={e => setQuantity(e.target.value)} 
                                min="1" 
                                step="1" 
                                className="bg-slate-700 border-slate-600"
                            />
                            {slippage?.warning && (
                                <p className="text-orange-400 text-xs">{slippage.warning}</p>
                            )}
                        </div>
                        
                        {/* AMM Pricing Details */}
                        <Card className="bg-slate-700/30 border-slate-600/50 p-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Theoretical Price</span>
                                <span className="font-semibold text-blue-400">{(theoreticalPrice || 0).toFixed(4)} aeUSDC</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Mid Price</span>
                                <span className="font-semibold">{(midPrice || 0).toFixed(4)} aeUSDC</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Your Price / Contract</span>
                                <span className="font-semibold text-lg">{(pricePerContract || 0).toFixed(4)} aeUSDC</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Spread</span>
                                    <span className={`font-semibold ${warningLevel === 'high' ? 'text-red-400' : warningLevel === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>
                                        {(spread || 0).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Price Impact</span>
                                    <span className={`font-semibold ${Math.abs(priceImpact || 0) > 3 ? 'text-red-400' : Math.abs(priceImpact || 0) > 1 ? 'text-yellow-400' : 'text-green-400'}`}>
                                        {(priceImpact || 0) > 0 ? '+' : ''}{(priceImpact || 0).toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                            <Separator className="bg-slate-600/50"/>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Total {tradeType === 'buy' ? 'Cost' : 'Credit'}</span>
                                <span className="font-semibold text-lg">{totalCost.toFixed(2)} aeUSDC</span>
                            </div>
                            {tradeType === 'sell' && collateralRequired > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Collateral Required</span>
                                    <span className="font-semibold text-orange-400">{collateralRequired.toFixed(2)} aeUSDC</span>
                                </div>
                            )}
                        </Card>

                        {/* Utilization Check Alert */}
                        {tradeType === 'sell' && !utilizationCheck.isAllowed && (
                            <Alert className="border-red-500/50 bg-red-500/10">
                                <ShieldAlert className="h-4 w-4 text-red-400" />
                                <AlertDescription className="text-red-300">
                                    <strong>Trade blocked:</strong> {utilizationCheck.message}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Slippage Warning */}
                        {slippage && slippage.estimatedSlippage > 1 && (
                            <Alert className={`border-${warningLevel === 'high' ? 'red' : 'yellow'}-500/50 bg-${warningLevel === 'high' ? 'red' : 'yellow'}-500/10`}>
                                <AlertTriangle className={`h-4 w-4 text-${warningLevel === 'high' ? 'red' : 'yellow'}-400`} />
                                <AlertDescription className={`text-${warningLevel === 'high' ? 'red' : 'yellow'}-300`}>
                                    <strong>High Slippage Warning:</strong> {slippage.estimatedSlippage.toFixed(2)}% expected slippage.
                                    {slippage.maxRecommendedSize < parseFloat(quantity) && (
                                        ` Consider reducing to ${slippage.maxRecommendedSize} contracts.`
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Greeks Display */}
                        {greeks && (
                            <Card className="bg-slate-700/30 border-slate-600/50 p-3">
                                <h4 className="text-slate-300 font-medium mb-2 text-sm">Option Greeks</h4>
                                <div className="grid grid-cols-3 gap-3 text-xs">
                                    <div className="text-center">
                                        <span className="text-slate-400">Delta</span>
                                        <p className="font-semibold">{greeks.delta.toFixed(3)}</p>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-slate-400">Theta</span>
                                        <p className="font-semibold text-red-400">{greeks.theta.toFixed(3)}</p>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-slate-400">Vega</span>
                                        <p className="font-semibold">{greeks.vega.toFixed(3)}</p>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Pool Impact Preview */}
                        {impact && parseFloat(quantity) > 5 && (
                            <Card className="bg-blue-500/10 border-blue-500/30 p-3">
                                <div className="flex items-start gap-2">
                                    <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                                    <div className="text-xs text-blue-300">
                                        <p className="font-semibold mb-1">Pool Impact Preview</p>
                                        <p>New pool size: ${(impact.newLiquidity/1000).toFixed(0)}k aeUSDC</p>
                                        <p>Price change: {impact.priceChange > 0 ? '+' : ''}{impact.priceChange.toFixed(2)}%</p>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Risk Warning for Selling Options */}
                        {tradeType === 'sell' && (
                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5" />
                                    <div className="text-xs text-orange-300">
                                        <p className="font-semibold mb-1">Selling Options Risk</p>
                                        <p>You will receive premium but take on unlimited risk. Collateral will be locked until expiration.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Execute Button */}
                        <Button 
                            onClick={handleTrade} 
                            disabled={!quantity || isExecuting || parseFloat(quantity) <= 0 || (slippage && !slippage.isAcceptable) || !utilizationCheck.isAllowed} 
                            className={`w-full text-lg py-6 ${tradeType === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}
                        >
                            {isExecuting ? (
                                <>
                                    <Zap className="w-5 h-5 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${quantity || '0'} Contract${parseInt(quantity) !== 1 ? 's' : ''}`
                            )}
                        </Button>
                        
                        {/* AMM Info */}
                        <div className="text-xs text-slate-400 text-center border-t border-slate-700/50 pt-3">
                            💡 Powered by Uniswap-style AMM • Larger trades = Higher spreads & price impact
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
