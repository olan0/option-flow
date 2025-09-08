import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { calculateGreeks, daysToYears } from "../utils/BlackScholesCalculator";

export default function GreeksDisplay({ 
  strategy, 
  currentPrice, 
  strikePrice, 
  daysToExpiration, 
  impliedVolatility 
}) {
  const calculatePositionGreeks = () => {
    const S = currentPrice;
    const K = strikePrice;
    const T = daysToYears(daysToExpiration);
    const sigma = impliedVolatility / 100; // Convert percentage to decimal
    const r = 0.05; // 5% risk-free rate

    return calculateGreeks({
      S, K, T, r, sigma,
      optionType: strategy.includes('call') ? 'call' : 'put'
    });
  };

  const greeks = calculatePositionGreeks();

  const greeksData = [
    { 
      name: 'Delta', 
      value: greeks.delta.toFixed(3), 
      description: 'Price sensitivity',
      color: greeks.delta >= 0 ? 'text-green-400' : 'text-red-400'
    },
    { 
      name: 'Gamma', 
      value: greeks.gamma.toFixed(4), 
      description: 'Delta sensitivity',
      color: 'text-blue-400'
    },
    { 
      name: 'Theta', 
      value: greeks.theta.toFixed(3), 
      description: 'Time decay (per day)',
      color: greeks.theta >= 0 ? 'text-green-400' : 'text-red-400'
    },
    { 
      name: 'Vega', 
      value: greeks.vega.toFixed(3), 
      description: 'Volatility sensitivity',
      color: 'text-purple-400'
    },
    { 
      name: 'Rho', 
      value: greeks.rho.toFixed(3), 
      description: 'Interest rate sensitivity',
      color: greeks.rho >= 0 ? 'text-green-400' : 'text-red-400'
    }
  ];

  return (
    <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Option Greeks (Black-Scholes)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {greeksData.map((greek) => (
            <div key={greek.name} className="text-center">
              <div className="bg-slate-700/30 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">{greek.name}</p>
                <p className={`text-lg font-bold ${greek.color}`}>
                  {greek.value}
                </p>
                <p className="text-xs text-slate-500 mt-1">{greek.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-slate-700/20 rounded-lg">
          <p className="text-xs text-slate-400 mb-2">Greeks Explanation:</p>
          <div className="text-xs text-slate-300 space-y-1">
            <p><span className="text-green-400 font-semibold">Delta:</span> Option price change per $1 move in underlying</p>
            <p><span className="text-blue-400 font-semibold">Gamma:</span> Delta change per $1 move in underlying</p>
            <p><span className="text-red-400 font-semibold">Theta:</span> Option value lost per day (time decay)</p>
            <p><span className="text-purple-400 font-semibold">Vega:</span> Option price change per 1% volatility change</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}