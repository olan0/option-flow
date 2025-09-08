import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Clock, Droplets } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function PoolAnalytics({ pools, trades, liquidityPositions, isLoading }) {
  const mockVolumeData = [
    { date: '2024-01-20', volume: 15000, liquidity: 850000 },
    { date: '2024-01-21', volume: 18000, liquidity: 875000 },
    { date: '2024-01-22', volume: 22000, liquidity: 900000 },
    { date: '2024-01-23', volume: 19000, liquidity: 920000 },
    { date: '2024-01-24', volume: 25000, liquidity: 950000 },
    { date: '2024-01-25', volume: 28000, liquidity: 980000 },
    { date: '2024-01-26', volume: 31000, liquidity: 1000000 },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-300 text-sm mb-1">{label}</p>
          <p className="text-blue-400 font-semibold">
            Volume: {payload[0].value.toLocaleString()} STX
          </p>
          <p className="text-green-400 font-semibold">
            Liquidity: {payload[1].value.toLocaleString()} STX
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Volume & Liquidity Chart */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Volume & Liquidity Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="liquidity" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Pools by Liquidity */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Droplets className="w-5 h-5" />
            Top Pools by Liquidity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50">
                  <TableHead className="text-slate-300">Pool</TableHead>
                  <TableHead className="text-slate-300">Liquidity</TableHead>
                  <TableHead className="text-slate-300">APY</TableHead>
                  <TableHead className="text-slate-300">Volume 24h</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {isLoading ? (
                    Array(4).fill(0).map((_, i) => (
                      <TableRow key={i} className="border-slate-700/30">
                        <TableCell><Skeleton className="h-4 w-24 bg-slate-700" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 bg-slate-700" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16 bg-slate-700" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-18 bg-slate-700" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    pools.slice(0, 5).map((pool, index) => (
                      <motion.tr
                        key={pool.pool_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{pool.underlying_asset}</span>
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                              ${pool.strike_price} {pool.option_type.toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-white font-medium">
                            {(pool.total_liquidity || 0).toLocaleString()} STX
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-green-400 font-semibold">
                            {(pool.apy || 0).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-blue-400 font-medium">
                            {(pool.total_volume || 0).toLocaleString()} STX
                          </span>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent AMM Trades
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50">
                  <TableHead className="text-slate-300">Type</TableHead>
                  <TableHead className="text-slate-300">Pool</TableHead>
                  <TableHead className="text-slate-300">Quantity</TableHead>
                  <TableHead className="text-slate-300">Price</TableHead>
                  <TableHead className="text-slate-300">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i} className="border-slate-700/30">
                        <TableCell><Skeleton className="h-4 w-12 bg-slate-700" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16 bg-slate-700" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-14 bg-slate-700" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-18 bg-slate-700" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 bg-slate-700" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    trades.slice(0, 8).map((trade, index) => (
                      <motion.tr
                        key={trade.trade_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {trade.trade_type === 'buy' ? (
                              <TrendingUp className="w-3 h-3 text-green-400" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-red-400" />
                            )}
                            <Badge className={`text-xs ${
                              trade.trade_type === 'buy' 
                                ? 'bg-green-500/20 text-green-300' 
                                : 'bg-red-500/20 text-red-300'
                            }`}>
                              {trade.trade_type.toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-white text-sm">{trade.pool_id?.slice(0, 8)}...</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-white font-medium">{trade.quantity}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-blue-400 font-medium">
                            {trade.price_per_contract?.toFixed(4)} STX
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-400 text-xs">
                            {trade.timestamp ? format(new Date(trade.timestamp * 1000), 'HH:mm:ss') : 'N/A'}
                          </span>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}