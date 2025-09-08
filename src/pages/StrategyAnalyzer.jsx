import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, TrendingUp, Target, DollarSign } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import StrategySelector from "../components/analyzer/StrategySelector";
import ProfitLossChart from "../components/analyzer/ProfitLossChart";
import GreeksDisplay from "../components/analyzer/GreeksDisplay";
import RiskMetrics from "../components/analyzer/RiskMetrics";

export default function StrategyAnalyzer() {
  const [strategy, setStrategy] = useState('long_call');
  const [symbol, setSymbol] = useState('AAPL');
  const [currentPrice, setCurrentPrice] = useState(150);
  const [strikePrice, setStrikePrice] = useState(155);
  const [premium, setPremium] = useState(3.50);
  const [daysToExpiration, setDaysToExpiration] = useState(30);
  const [impliedVolatility, setImpliedVolatility] = useState(25);

  const calculateProfitLoss = () => {
    const priceRange = [];
    const minPrice = currentPrice * 0.8;
    const maxPrice = currentPrice * 1.2;
    const step = (maxPrice - minPrice) / 50;

    for (let price = minPrice; price <= maxPrice; price += step) {
      let pnl = 0;
      
      if (strategy === 'long_call') {
        pnl = Math.max(0, price - strikePrice) - premium;
      } else if (strategy === 'long_put') {
        pnl = Math.max(0, strikePrice - price) - premium;
      } else if (strategy === 'covered_call') {
        pnl = Math.min(strikePrice - currentPrice, price - currentPrice) + premium;
      }
      
      priceRange.push({
        price: price.toFixed(2),
        pnl: pnl.toFixed(2),
        breakeven: Math.abs(pnl) < 0.1
      });
    }
    
    return priceRange;
  };

  const profitLossData = calculateProfitLoss();
  const maxProfit = Math.max(...profitLossData.map(d => parseFloat(d.pnl)));
  const maxLoss = Math.min(...profitLossData.map(d => parseFloat(d.pnl)));
  const breakeven = profitLossData.find(d => d.breakeven)?.price || strikePrice + premium;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Strategy Analyzer</h1>
            <p className="text-slate-400 text-lg">Analyze profit/loss scenarios for options strategies</p>
          </div>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-400" />
            <span className="text-slate-300">Advanced P&L Calculator</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Strategy Configuration */}
          <div className="space-y-6">
            <StrategySelector strategy={strategy} setStrategy={setStrategy} />
            
            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Position Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Symbol</Label>
                  <Input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="AAPL"
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Current Price</Label>
                  <Input
                    type="number"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(parseFloat(e.target.value))}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Strike Price</Label>
                  <Input
                    type="number"
                    value={strikePrice}
                    onChange={(e) => setStrikePrice(parseFloat(e.target.value))}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Premium</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={premium}
                    onChange={(e) => setPremium(parseFloat(e.target.value))}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Days to Expiration</Label>
                  <Input
                    type="number"
                    value={daysToExpiration}
                    onChange={(e) => setDaysToExpiration(parseInt(e.target.value))}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Implied Volatility (%)</Label>
                  <Input
                    type="number"
                    value={impliedVolatility}
                    onChange={(e) => setImpliedVolatility(parseFloat(e.target.value))}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Risk Metrics */}
            <div className="grid md:grid-cols-3 gap-4">
              <RiskMetrics
                title="Max Profit"
                value={maxProfit > 1000 ? '∞' : `$${maxProfit.toFixed(2)}`}
                icon={TrendingUp}
                color="text-green-400"
              />
              <RiskMetrics
                title="Max Loss"
                value={`$${Math.abs(maxLoss).toFixed(2)}`}
                icon={TrendingUp}
                color="text-red-400"
              />
              <RiskMetrics
                title="Breakeven"
                value={`$${parseFloat(breakeven).toFixed(2)}`}
                icon={Target}
                color="text-blue-400"
              />
            </div>

            {/* Profit/Loss Chart */}
            <ProfitLossChart data={profitLossData} currentPrice={currentPrice} />

            {/* Greeks Display */}
            <GreeksDisplay 
              strategy={strategy}
              currentPrice={currentPrice}
              strikePrice={strikePrice}
              daysToExpiration={daysToExpiration}
              impliedVolatility={impliedVolatility}
            />
          </div>
        </div>
      </div>
    </div>
  );
}