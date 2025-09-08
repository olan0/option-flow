import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";

const mockPerformanceData = [
  { date: '2024-01-01', value: 10000, pnl: 0 },
  { date: '2024-01-08', value: 10250, pnl: 250 },
  { date: '2024-01-15', value: 9800, pnl: -200 },
  { date: '2024-01-22', value: 11100, pnl: 1100 },
  { date: '2024-01-29', value: 10950, pnl: 950 },
  { date: '2024-02-05', value: 11400, pnl: 1400 },
  { date: '2024-02-12', value: 11200, pnl: 1200 },
];

export default function PerformanceChart({ positions, isLoading }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-300 text-sm mb-1">{label}</p>
          <p className="text-white font-semibold">
            Portfolio: ${payload[0].value.toLocaleString()}
          </p>
          <p className={`text-sm ${payload[1].value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            P&L: {payload[1].value >= 0 ? '+' : ''}${payload[1].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
      <CardHeader className="border-b border-slate-700/50">
        <CardTitle className="text-xl font-bold text-white">Portfolio Performance</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24 bg-slate-700" />
              <Skeleton className="h-4 w-32 bg-slate-700" />
            </div>
            <Skeleton className="h-64 w-full bg-slate-700" />
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#1e40af' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}