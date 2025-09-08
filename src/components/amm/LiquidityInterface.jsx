
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Droplets, Plus, Calculator, TrendingUp } from "lucide-react";
import PoolHealthIndicator from './PoolHealthIndicator';

export default function LiquidityInterface({ 
  selectedPool, 
  pools, 
  onPoolSelect, 
  onLiquidityAdded 
}) {
  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const calculateLPTokens = () => {
    if (!selectedPool || !liquidityAmount) return 0;
    
    // Simplified LP token calculation
    const poolTotalSupply = 1000000; // Assume 1M total LP tokens
    const currentLiquidity = selectedPool.total_liquidity || 1000;
    const newLiquidity = parseFloat(liquidityAmount) || 0;
    
    return (newLiquidity / (currentLiquidity + newLiquidity)) * poolTotalSupply * 0.1;
  };

  const estimatedAPY = () => {
    if (!selectedPool) return 0;
    return selectedPool.apy || 24.5;
  };

  const lpTokens = calculateLPTokens();
  const estimatedYearlyReward = (parseFloat(liquidityAmount) || 0) * (estimatedAPY() / 100);

  const handleAddLiquidity = async () => {
    if (!selectedPool || !liquidityAmount) return;
    
    setIsAdding(true);
    try {
      // Simulate contract interaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Adding liquidity:', {
        pool: selectedPool.pool_id,
        amount: parseFloat(liquidityAmount),
        lpTokens: lpTokens
      });
      
      onLiquidityAdded();
      setLiquidityAmount('');
    } catch (error) {
      console.error('Add liquidity failed:', error);
    }
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      {/* Pool Selection */}
      <div className="space-y-2">
        <Label className="text-slate-300">Select Pool</Label>
        <Select 
          value={selectedPool?.pool_id || ''} 
          onValueChange={(poolId) => {
            const pool = pools.find(p => p.pool_id === poolId);
            if (pool) onPoolSelect(pool);
          }}
        >
          <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
            <SelectValue placeholder="Select a liquidity pool" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {pools.map((pool) => (
              <SelectItem key={pool.pool_id} value={pool.pool_id} className="text-white hover:bg-slate-700">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-sm">{pool.underlying_asset}</span>
                  <Badge variant="outline" className="border-slate-600">
                    ${pool.strike_price} {pool.option_type.toUpperCase()}
                  </Badge>
                  <Badge variant="secondary" className="bg-slate-600/50 text-slate-300">
                    Exp: {new Date(pool.expiration_timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Badge>
                  <Badge className="text-xs bg-green-500/20 text-green-300">
                    {pool.apy?.toFixed(1)}% APY
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPool && (
        <>
          <PoolHealthIndicator pool={selectedPool} />
        
          {/* Liquidity Amount Input */}
          <div className="space-y-2">
            <Label className="text-slate-300">Liquidity Amount (aeUSDC)</Label>
            <Input
              type="number"
              value={liquidityAmount}
              onChange={(e) => setLiquidityAmount(e.target.value)}
              placeholder="Enter aeUSDC amount"
              className="bg-slate-700/50 border-slate-600 text-white"
            />
          </div>

          {/* Liquidity Summary */}
          {liquidityAmount && (
            <Card className="bg-slate-700/30 border-slate-600">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">aeUSDC Deposit</span>
                  <span className="text-white font-semibold">{parseFloat(liquidityAmount).toLocaleString()} aeUSDC</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">LP Tokens Received</span>
                  <span className="text-blue-400 font-semibold">{lpTokens.toFixed(2)} LP</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Pool Share</span>
                  <span className="text-green-400 font-semibold">
                    {((parseFloat(liquidityAmount) / (selectedPool.total_liquidity + parseFloat(liquidityAmount))) * 100).toFixed(3)}%
                  </span>
                </div>
                <Separator className="bg-slate-600" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Est. Yearly Rewards</span>
                  <span className="text-green-400 font-semibold">{estimatedYearlyReward.toFixed(2)} aeUSDC</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pool Performance Metrics */}
          <Card className="bg-slate-700/20 border-slate-600">
            <CardContent className="p-4">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Pool Performance
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Current APY</span>
                  <p className="text-green-400 font-semibold">{estimatedAPY().toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-slate-400">24h Volume</span>
                  <p className="text-white font-semibold">{(selectedPool.total_volume || 0).toLocaleString()} aeUSDC</p>
                </div>
                <div>
                  <span className="text-slate-400">Total Liquidity</span>
                  <p className="text-white font-semibold">{selectedPool.total_liquidity?.toLocaleString()} aeUSDC</p>
                </div>
                <div>
                  <span className="text-slate-400">Fee Revenue</span>
                  <p className="text-blue-400 font-semibold">{((selectedPool.total_volume || 0) * selectedPool.fee_rate).toFixed(2)} aeUSDC</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Warning */}
          <Card className="bg-orange-500/10 border-orange-500/30">
            <CardContent className="p-4">
              <h4 className="text-orange-300 font-semibold mb-2">Liquidity Provider Risks</h4>
              <ul className="text-orange-200 text-sm space-y-1">
                <li>• Impermanent loss due to price movements</li>
                <li>• Smart contract risks</li>
                <li>• Options can expire worthless</li>
                <li>• Liquidity may be locked until expiration</li>
              </ul>
            </CardContent>
          </Card>

          {/* Add Liquidity Button */}
          <Button
            onClick={handleAddLiquidity}
            disabled={!liquidityAmount || isAdding}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isAdding ? (
              <>
                <Droplets className="w-4 h-4 mr-2 animate-pulse" />
                Adding Liquidity...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add {liquidityAmount || '0'} aeUSDC Liquidity
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
