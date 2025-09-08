import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator } from "lucide-react";

const strategies = [
  { value: 'long_call', label: 'Long Call', risk: 'Limited', reward: 'Unlimited' },
  { value: 'long_put', label: 'Long Put', risk: 'Limited', reward: 'High' },
  { value: 'covered_call', label: 'Covered Call', risk: 'High', reward: 'Limited' },
  { value: 'cash_secured_put', label: 'Cash Secured Put', risk: 'High', reward: 'Limited' },
  { value: 'iron_condor', label: 'Iron Condor', risk: 'Limited', reward: 'Limited' },
  { value: 'butterfly', label: 'Butterfly', risk: 'Limited', reward: 'Limited' },
  { value: 'straddle', label: 'Straddle', risk: 'Limited', reward: 'Unlimited' },
  { value: 'strangle', label: 'Strangle', risk: 'Limited', reward: 'Unlimited' }
];

export default function StrategySelector({ strategy, setStrategy }) {
  const currentStrategy = strategies.find(s => s.value === strategy);

  return (
    <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Strategy Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={strategy} onValueChange={setStrategy}>
          <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
            <SelectValue placeholder="Select strategy" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {strategies.map((strat) => (
              <SelectItem key={strat.value} value={strat.value} className="text-white hover:bg-slate-700">
                {strat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {currentStrategy && (
          <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-white">{currentStrategy.label}</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Risk:</span>
                <span className={`ml-2 font-medium ${
                  currentStrategy.risk === 'Limited' ? 'text-green-400' : 'text-orange-400'
                }`}>
                  {currentStrategy.risk}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Reward:</span>
                <span className={`ml-2 font-medium ${
                  currentStrategy.reward === 'Unlimited' ? 'text-green-400' : 
                  currentStrategy.reward === 'High' ? 'text-blue-400' : 'text-orange-400'
                }`}>
                  {currentStrategy.reward}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}