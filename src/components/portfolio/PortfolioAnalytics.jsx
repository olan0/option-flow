import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, BarChart3, Target } from "lucide-react";

export default function PortfolioAnalytics({ positions, isLoading }) {
  // Calculate strategy distribution
  const strategyDistribution = positions.reduce((acc, pos) => {
    const strategy = pos.strategy_type || 'unknown';
    acc[strategy] = (acc[strategy] || 0) + 1;
    return acc;
  }, {});

  const strategyData = Object.entries(strategyDistribution).map(([strategy, count]) => ({
    name: strategy.replace(/_/g, ' '),
    value: count
  }));

  // Calculate symbol distribution
  const symbolDistribution = positions.reduce((acc, pos) => {
    const symbol = pos.symbol;
    const value = (pos.current_value || 0) * (pos.contracts || 0);
    acc[symbol] = (acc[symbol] || 0) + value;
    return acc;
  }, {});

  const symbolData = Object.entries(symbolDistribution).map(([symbol, value]) => ({
    name: symbol,
    value: value
  }));

  // Calculate P&L by month
  const pnlByMonth = positions.reduce((acc, pos) => {
    const date = new Date(pos.entry_date || pos.created_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = { month: monthKey, pnl: 0 };
    }
    
    acc[monthKey].pnl += pos.profit_loss || 0;
    return acc;
  }, {});

  const pnlData = Object.values(pnlByMonth).sort((a, b) => a.month.localeCompare(b.month));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-300 text-sm mb-1">{label}</p>
          <p className="text-white font-semibold">
            Value: {typeof payload[0].value === 'number' ? payload[0].value.toLocaleString() : payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Strategy Distribution */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" />
            Strategy Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {strategyData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={strategyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {strategyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asset Allocation */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5" />
            Asset Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {symbolData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={symbolData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {symbolData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* P&L Trend */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Monthly P&L Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pnlData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="pnl" 
                    fill={(data) => data >= 0 ? '#10b981' : '#ef4444'}
                  >
                    {pnlData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No P&L data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}