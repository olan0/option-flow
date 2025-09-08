import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Calendar, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const strategyColors = {
  long_call: "bg-green-500/20 text-green-300 border-green-500/30",
  long_put: "bg-red-500/20 text-red-300 border-red-500/30",
  covered_call: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  cash_secured_put: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  iron_condor: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  butterfly: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  straddle: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  strangle: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
};

export default function RecentPositions({ positions, isLoading }) {
  return (
    <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
      <CardHeader className="border-b border-slate-700/50">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-white">Recent Positions</CardTitle>
          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700/50 hover:bg-slate-700/20">
                <TableHead className="text-slate-300">Symbol</TableHead>
                <TableHead className="text-slate-300">Strategy</TableHead>
                <TableHead className="text-slate-300">Strike/Exp</TableHead>
                <TableHead className="text-slate-300">P&L</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i} className="border-slate-700/30">
                      <TableCell><Skeleton className="h-4 w-16 bg-slate-700" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full bg-slate-700" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 bg-slate-700" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 bg-slate-700" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full bg-slate-700" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  positions.slice(0, 8).map((position, index) => (
                    <motion.tr
                      key={position.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-slate-700/30 hover:bg-slate-700/20 transition-colors cursor-pointer"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{position.symbol}</span>
                          <Badge variant="outline" className={`text-xs ${
                            position.option_type === 'call' ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'
                          }`}>
                            {position.option_type.toUpperCase()}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${strategyColors[position.strategy_type]} border`}>
                          {position.strategy_type?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="text-white font-medium">${position.strike_price}</div>
                          <div className="text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(position.expiration_date), 'MMM d')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {(position.profit_loss || 0) >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          <span className={`font-semibold ${
                            (position.profit_loss || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {(position.profit_loss || 0) >= 0 ? '+' : ''}${Math.abs(position.profit_loss || 0).toFixed(0)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={position.status === 'open' ? 'default' : 'secondary'} 
                               className={position.status === 'open' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-600 text-slate-300'}>
                          {position.status}
                        </Badge>
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
  );
}