
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Edit, 
  Trash2,
  Eye,
  MoreHorizontal
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export default function PositionsList({ 
  positions, 
  onUpdatePosition, 
  isLoading, 
  currentPrices 
}) {
  const [selectedPosition, setSelectedPosition] = useState(null);

  const calculateDaysToExpiration = (expirationDate) => {
    return differenceInDays(new Date(expirationDate), new Date());
  };

  const getExpirationStatus = (days) => {
    if (days < 0) return { label: 'Expired', color: 'bg-red-500/20 text-red-300' };
    if (days <= 7) return { label: `${days}d left`, color: 'bg-orange-500/20 text-orange-300' };
    if (days <= 30) return { label: `${days}d left`, color: 'bg-yellow-500/20 text-yellow-300' };
    return { label: `${days}d left`, color: 'bg-green-500/20 text-green-300' };
  };

  const getCurrentPrice = (symbol) => {
    if (symbol === 'sBTC' && currentPrices?.sBTC) {
      return currentPrices.sBTC.current_price;
    }
    if (symbol === 'STX' && currentPrices?.STX) {
      return currentPrices.STX.current_price;
    }
    return null;
  };

  const calculateCurrentValue = (position) => {
    const currentPrice = getCurrentPrice(position.symbol);
    if (!currentPrice) return position.current_value || 0;

    // Simplified intrinsic value calculation
    let intrinsicValue = 0;
    if (position.option_type === 'call') {
      intrinsicValue = Math.max(0, currentPrice - position.strike_price);
    } else {
      intrinsicValue = Math.max(0, position.strike_price - currentPrice);
    }

    // Add time value (simplified)
    const daysToExp = calculateDaysToExpiration(position.expiration_date);
    const timeValue = daysToExp > 0 ? intrinsicValue * 0.1 * (daysToExp / 30) : 0;
    
    return intrinsicValue + timeValue;
  };

  return (
    <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
      <CardHeader className="border-b border-slate-700/50">
        <CardTitle className="text-white">Active Positions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700/50 hover:bg-slate-700/20">
                <TableHead className="text-slate-300">Position</TableHead>
                <TableHead className="text-slate-300">Strategy</TableHead>
                <TableHead className="text-slate-300">Entry Date</TableHead>
                <TableHead className="text-slate-300">Expiration</TableHead>
                <TableHead className="text-slate-300">Current Value (aeUSDC)</TableHead>
                <TableHead className="text-slate-300">P&L (aeUSDC)</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i} className="border-slate-700/30">
                      <TableCell><Skeleton className="h-4 w-20 bg-slate-700" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full bg-slate-700" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 bg-slate-700" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 bg-slate-700" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 bg-slate-700" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 bg-slate-700" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full bg-slate-700" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded bg-slate-700" /></TableCell>
                    </TableRow>
                  ))
                ) : positions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                      No positions found. Add your first position to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  positions.map((position, index) => {
                    const daysToExpiration = calculateDaysToExpiration(position.expiration_date);
                    const expirationStatus = getExpirationStatus(daysToExpiration);
                    const currentValue = calculateCurrentValue(position);
                    const totalValue = currentValue * position.contracts;
                    const totalCost = position.premium_paid * position.contracts;
                    const pnl = totalValue - totalCost;

                    return (
                      <motion.tr
                        key={position.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{position.symbol}</span>
                            <Badge className={position.option_type === 'call' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                              {position.option_type.toUpperCase()}
                            </Badge>
                            <span className="text-slate-300">${position.strike_price}</span>
                            <span className="text-slate-400 text-sm">×{position.contracts}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${strategyColors[position.strategy_type]} border`}>
                            {position.strategy_type?.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-300">
                            {format(new Date(position.entry_date || position.created_date), 'MMM d, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <div>
                              <div className="text-slate-300 text-sm">
                                {format(new Date(position.expiration_date), 'MMM d')}
                              </div>
                              <Badge className={`${expirationStatus.color} text-xs`}>
                                {expirationStatus.label}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-white font-medium">
                            ${totalValue.toFixed(2)}
                          </div>
                          <div className="text-slate-400 text-sm">
                            ${currentValue.toFixed(2)} per contract
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {pnl >= 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-400" />
                            )}
                            <div>
                              <span className={`font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                              </span>
                              <div className={`text-xs ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {totalCost !== 0 ? `${((pnl / totalCost) * 100).toFixed(1)}%` : 'N/A'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={position.status === 'open' ? 'default' : 'secondary'}
                            className={position.status === 'open' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-600 text-slate-300'}
                          >
                            {position.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="hover:bg-slate-700">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-800 border-slate-700">
                              <DropdownMenuItem className="text-slate-300 hover:bg-slate-700">
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-slate-300 hover:bg-slate-700">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Position
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-400 hover:bg-slate-700">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Close Position
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
