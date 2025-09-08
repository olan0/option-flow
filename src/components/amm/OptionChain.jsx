
import React from 'react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateAmmOptionPrice } from "../utils/AmmPricing";

const calculateAmmPrice = (pool, currentPrices, tradeSize = 1) => {
    if (!pool || !currentPrices) return { bid: 0, ask: 0, spread: 0, midPrice: 0, theoretical: 0 };
    
    try {
        const underlyingPrice = currentPrices[pool.underlying_asset] || 0;
        if (underlyingPrice === 0) return { bid: 0, ask: 0, spread: 0, midPrice: 0, theoretical: 0 };

        const strikePrice = pool.strike_price || 0;
        const daysToExpiration = Math.max(1, Math.floor((pool.expiration_timestamp * 1000 - Date.now()) / (1000 * 60 * 60 * 24)));
        const impliedVolatility = pool.implied_volatility || 45;
        
        // Calculate buy price (ask)
        const buyPrice = calculateAmmOptionPrice({
            underlyingPrice,
            strikePrice,
            daysToExpiration,
            impliedVolatility,
            optionType: pool.option_type,
            poolLiquidity: pool.total_liquidity || 1000000,
            totalVolume: pool.total_volume || 50000,
            tradeSize,
            side: 'buy'
        });
        
        // Calculate sell price (bid)  
        const sellPrice = calculateAmmOptionPrice({
            underlyingPrice,
            strikePrice,
            daysToExpiration,
            impliedVolatility,
            optionType: pool.option_type,
            poolLiquidity: pool.total_liquidity || 1000000,
            totalVolume: pool.total_volume || 50000,
            tradeSize,
            side: 'sell'
        });
        
        return {
            bid: sellPrice?.price || 0,
            ask: buyPrice?.price || 0,
            spread: buyPrice?.spread || 0,
            midPrice: buyPrice?.midPrice || 0,
            theoretical: buyPrice?.theoreticalPrice || 0
        };
    } catch (error) {
        console.error('Error calculating AMM price:', error);
        return { bid: 0, ask: 0, spread: 0, midPrice: 0, theoretical: 0 };
    }
};

export default function OptionChain({ pools, onSelectContract, isLoading, currentPrices }) {
  const strikes = [...new Set((pools || []).map(p => p?.strike_price || 0).filter(s => s > 0))].sort((a, b) => a - b);

  const getContractForStrike = (strike, type) => {
    return (pools || []).find(p => p?.strike_price === strike && p?.option_type === type);
  };
  
  if (isLoading) {
    return (
        <div className="space-y-2 p-4">
            {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-slate-800/50">
                    <Skeleton className="h-6 w-1/4 bg-slate-700"/>
                    <Skeleton className="h-8 w-20 bg-slate-700 rounded-md"/>
                    <Skeleton className="h-6 w-1/4 bg-slate-700"/>
                </div>
            ))}
        </div>
    )
  }

  if (!strikes.length) {
    return (
        <div className="p-8 text-center">
            <p className="text-slate-400">No option contracts available</p>
        </div>
    );
  }

  return (
    <div className="overflow-x-auto">
        <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center text-xs text-slate-400 uppercase tracking-wider px-4 py-2 border-y border-slate-700/50 bg-slate-900/30">
            <div className="text-left font-semibold text-green-400">Calls</div>
            <div className="text-center font-semibold">Strike</div>
            <div className="text-right font-semibold text-red-400">Puts</div>
        </div>
        <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center text-xs text-slate-400 px-4 py-2 border-b border-slate-700/50">
            <div className="grid grid-cols-5 text-center gap-1">
                <span>Bid</span>
                <span>Ask</span>
                <span>Spread</span>
                <span>Volume</span>
                <span>IV</span>
            </div>
            <div></div>
            <div className="grid grid-cols-5 text-center gap-1">
                <span>Bid</span>
                <span>Ask</span>
                <span>Spread</span>
                <span>Volume</span>
                <span>IV</span>
            </div>
        </div>
      
      <div className="max-h-[500px] overflow-y-auto">
        {strikes.map((strike) => {
            const callContract = getContractForStrike(strike, 'call');
            const putContract = getContractForStrike(strike, 'put');

            const callPrices = calculateAmmPrice(callContract, currentPrices);
            const putPrices = calculateAmmPrice(putContract, currentPrices);

            return (
                <div key={strike} className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-slate-800/80 transition-colors group">
                    {/* Call side */}
                    <div className="grid grid-cols-5 text-center p-2 items-center">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="hover:bg-red-500/20 text-red-400 font-mono text-xs" 
                            disabled={!callContract} 
                            onClick={() => callContract && onSelectContract(callContract, 'sell')}
                            title={`Sell Call - Bid: ${(callPrices.bid || 0).toFixed(2)} aeUSDC (Spread: ${(callPrices.spread || 0).toFixed(1)}%)`}
                        >
                            {(callPrices.bid || 0) > 0 ? (callPrices.bid || 0).toFixed(2) : '-'}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="hover:bg-green-500/20 text-green-400 font-mono text-xs" 
                            disabled={!callContract} 
                            onClick={() => callContract && onSelectContract(callContract, 'buy')}
                            title={`Buy Call - Ask: ${(callPrices.ask || 0).toFixed(2)} aeUSDC (Spread: ${(callPrices.spread || 0).toFixed(1)}%)`}
                        >
                           {(callPrices.ask || 0) > 0 ? (callPrices.ask || 0).toFixed(2) : '-'}
                        </Button>
                        <span className={`text-xs font-medium ${(callPrices.spread || 0) > 5 ? 'text-red-400' : (callPrices.spread || 0) > 2 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {(callPrices.spread || 0) > 0 ? `${(callPrices.spread || 0).toFixed(1)}%` : '-'}
                        </span>
                        <span className="text-slate-300 text-xs">{callContract?.total_volume ? `${((callContract.total_volume || 0)/1000).toFixed(0)}k` : '-'}</span>
                        <span className="text-slate-300 text-xs">{callContract?.implied_volatility ? `${callContract.implied_volatility}%` : '-'}</span>
                    </div>

                    {/* Strike price */}
                    <div className="px-4 py-4 font-bold text-lg text-white bg-slate-800/50 group-hover:bg-slate-700/50 transition-colors">
                        ${(strike || 0).toLocaleString()}
                    </div>

                    {/* Put side */}
                    <div className="grid grid-cols-5 text-center p-2 items-center">
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            className="hover:bg-red-500/20 text-red-400 font-mono text-xs" 
                            disabled={!putContract} 
                            onClick={() => putContract && onSelectContract(putContract, 'sell')}
                            title={`Sell Put - Bid: ${(putPrices.bid || 0).toFixed(2)} aeUSDC (Spread: ${(putPrices.spread || 0).toFixed(1)}%)`}
                        >
                            {(putPrices.bid || 0) > 0 ? (putPrices.bid || 0).toFixed(2) : '-'}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="hover:bg-green-500/20 text-green-400 font-mono text-xs" 
                            disabled={!putContract} 
                            onClick={() => putContract && onSelectContract(putContract, 'buy')}
                            title={`Buy Put - Ask: ${(putPrices.ask || 0).toFixed(2)} aeUSDC (Spread: ${(putPrices.spread || 0).toFixed(1)}%)`}
                        >
                           {(putPrices.ask || 0) > 0 ? (putPrices.ask || 0).toFixed(2) : '-'}
                        </Button>
                        <span className={`text-xs font-medium ${(putPrices.spread || 0) > 5 ? 'text-red-400' : (putPrices.spread || 0) > 2 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {(putPrices.spread || 0) > 0 ? `${(putPrices.spread || 0).toFixed(1)}%` : '-'}
                        </span>
                        <span className="text-slate-300 text-xs">{putContract?.total_volume ? `${((putContract.total_volume || 0)/1000).toFixed(0)}k` : '-'}</span>
                        <span className="text-slate-300 text-xs">{putContract?.implied_volatility ? `${putContract.implied_volatility}%` : '-'}</span>
                    </div>
                </div>
            );
        })}
      </div>
      
      <div className="p-4 bg-slate-900/30 border-t border-slate-700/50 text-xs text-slate-400">
        <div className="flex justify-between items-center">
          <span>{`sBTC: $${(currentPrices?.sBTC || 0).toLocaleString()} | STX: $${(currentPrices?.STX || 0).toFixed(2)}`}</span>
          <div className="flex gap-4">
            <span>🟢 &lt;2% spread</span>
            <span>🟡 2-5% spread</span>
            <span>🔴 &gt;5% spread</span>
          </div>
        </div>
      </div>
    </div>
  );
}
