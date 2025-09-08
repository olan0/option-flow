import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

export default function PortfolioFilters({ filters, onFiltersChange, positions }) {
  const handleFilterChange = (key, value) => {
    onFiltersChange(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const uniqueSymbols = [...new Set(positions.map(p => p.symbol))];
  const uniqueStrategies = [...new Set(positions.map(p => p.strategy_type).filter(Boolean))];

  return (
    <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 text-sm font-medium">Filters:</span>
          </div>

          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="w-32 bg-slate-700/50 border-slate-600 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">All Status</SelectItem>
              <SelectItem value="open" className="text-white">Open</SelectItem>
              <SelectItem value="closed" className="text-white">Closed</SelectItem>
              <SelectItem value="expired" className="text-white">Expired</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.symbol} onValueChange={(value) => handleFilterChange('symbol', value)}>
            <SelectTrigger className="w-32 bg-slate-700/50 border-slate-600 text-white">
              <SelectValue placeholder="Symbol" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">All Symbols</SelectItem>
              {uniqueSymbols.map(symbol => (
                <SelectItem key={symbol} value={symbol} className="text-white">{symbol}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.strategy} onValueChange={(value) => handleFilterChange('strategy', value)}>
            <SelectTrigger className="w-40 bg-slate-700/50 border-slate-600 text-white">
              <SelectValue placeholder="Strategy" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">All Strategies</SelectItem>
              {uniqueStrategies.map(strategy => (
                <SelectItem key={strategy} value={strategy} className="text-white">
                  {strategy?.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.expiration} onValueChange={(value) => handleFilterChange('expiration', value)}>
            <SelectTrigger className="w-36 bg-slate-700/50 border-slate-600 text-white">
              <SelectValue placeholder="Expiration" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">All Dates</SelectItem>
              <SelectItem value="this_week" className="text-white">This Week</SelectItem>
              <SelectItem value="this_month" className="text-white">This Month</SelectItem>
              <SelectItem value="expired" className="text-white">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}