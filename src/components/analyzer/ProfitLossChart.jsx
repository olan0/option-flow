import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp } from "lucide-react";

export default function ProfitLossChart({ data, currentPrice }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const pnl = parseFloat(payload[0].value);
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-300 text-sm mb-1">Stock Price: ${label}</p>
          <p className={`font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            P&L: {pnl >= 0 ? '+' : ''}${pnl}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Profit/Loss Diagram
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="price" 
                stroke="#64748b"
                fontSize={12}
                tickFormatter={(value) => `$${parseFloat(value).toFixed(0)}`}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={12}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="2 2" />
              <ReferenceLine x={currentPrice} stroke="#3b82f6" strokeDasharray="5 5" />
              <Line 
                type="monotone" 
                dataKey="pnl" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#059669' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-between text-sm text-slate-400">
          <span>Current Price: ${currentPrice}</span>
          <span>Blue line indicates current stock price</span>
        </div>
      </CardContent>
    </Card>
  );
}