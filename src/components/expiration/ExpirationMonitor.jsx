
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle, CheckCircle, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { format, differenceInDays, isToday, isPast, addDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function ExpirationMonitor({ positions, onProcessExpiration }) {
  const [expiringPositions, setExpiringPositions] = useState([]);
  const [expiredPositions, setExpiredPositions] = useState([]);
  const [currentPrices, setCurrentPrices] = useState({ sBTC: 68420, STX: 2.15 });

  useEffect(() => {
    const now = new Date();
    const sevenDaysFromNow = addDays(now, 7);

    const expiring = (positions || []).filter(pos => {
      const expDate = new Date(pos.expiration_date);
      return expDate >= now && expDate <= sevenDaysFromNow && pos.status === 'open';
    });

    const expired = (positions || []).filter(pos => {
      const expDate = new Date(pos.expiration_date);
      return isPast(expDate) && pos.status === 'open';
    });

    setExpiringPositions(expiring.sort((a, b) => new Date(a.expiration_date) - new Date(b.expiration_date)));
    setExpiredPositions(expired);
  }, [positions]);

  const calculateIntrinsicValue = (position) => {
    const currentPrice = currentPrices[position.symbol] || 0;
    const { option_type, strike_price, contracts } = position;
    let intrinsicValue = 0;

    if (option_type === 'call') {
      intrinsicValue = Math.max(0, currentPrice - (strike_price || 0)) * (contracts || 1);
    } else {
      intrinsicValue = Math.max(0, (strike_price || 0) - currentPrice) * (contracts || 1);
    }

    return intrinsicValue;
  };

  const getDaysToExpiration = (expirationDate) => {
    return differenceInDays(new Date(expirationDate), new Date());
  };

  const getExpirationUrgency = (days) => {
    if (days <= 0) return 'expired';
    if (days <= 1) return 'critical';
    if (days <= 3) return 'warning';
    return 'normal';
  };

  const urgencyColors = {
    expired: 'bg-red-500/20 text-red-300 border-red-500/30',
    critical: 'bg-red-500/20 text-red-300 border-red-500/30',
    warning: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    normal: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  };

  return (
    <div className="space-y-6">
      {/* Price Display */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Settlement Prices:</span>
            <div className="flex gap-4">
              <span className="text-white">sBTC: ${(currentPrices.sBTC || 0).toLocaleString()}</span>
              <span className="text-white">STX: ${(currentPrices.STX || 0).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expiration Alerts */}
      {expiredPositions.length > 0 && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            <span className="font-semibold">{expiredPositions.length} position(s) have expired</span> and require immediate attention for settlement processing.
          </AlertDescription>
        </Alert>
      )}

      {expiringPositions.filter(p => getDaysToExpiration(p.expiration_date) <= 3).length > 0 && (
        <Alert className="border-orange-500/50 bg-orange-500/10">
          <Clock className="h-4 w-4 text-orange-400" />
          <AlertDescription className="text-orange-300">
            <span className="font-semibold">
              {expiringPositions.filter(p => getDaysToExpiration(p.expiration_date) <= 3).length} position(s) expire
            </span> within the next 3 days. Review your positions for potential actions.
          </AlertDescription>
        </Alert>
      )}

      {/* Expired Positions Requiring Action */}
      {expiredPositions.length > 0 && (
        <Card className="bg-slate-800/50 backdrop-blur-xl border-red-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Expired Positions - Action Required
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50">
                    <TableHead className="text-slate-300">Position</TableHead>
                    <TableHead className="text-slate-300">Expired</TableHead>
                    <TableHead className="text-slate-300">Settlement Price</TableHead>
                    <TableHead className="text-slate-300">Intrinsic Value</TableHead>
                    <TableHead className="text-slate-300">Final P&L</TableHead>
                    <TableHead className="text-slate-300">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {expiredPositions.map((position, index) => {
                      const currentPrice = currentPrices[position.symbol] || 0;
                      const intrinsicValue = calculateIntrinsicValue(position);
                      const finalPnL = intrinsicValue - ((position.premium_paid || 0) * (position.contracts || 1));

                      return (
                        <motion.tr
                          key={position.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{position.symbol || 'N/A'}</span>
                              <Badge className={position.option_type === 'call' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                                {(position.option_type || 'unknown').toUpperCase()}
                              </Badge>
                              <span className="text-slate-300">${(position.strike_price || 0)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-red-400 font-medium">
                              {position.expiration_date ? format(new Date(position.expiration_date), 'MMM dd, yyyy') : 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-blue-400 font-medium">
                              ${currentPrice.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`font-semibold ${intrinsicValue > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                              ${intrinsicValue.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {finalPnL >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-400" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-400" />
                              )}
                              <span className={`font-semibold ${finalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {finalPnL >= 0 ? '+' : ''}${finalPnL.toLocaleString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => onProcessExpiration && onProcessExpiration(position, intrinsicValue, finalPnL)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Process Settlement
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Expirations */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Expirations (Next 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50">
                  <TableHead className="text-slate-300">Position</TableHead>
                  <TableHead className="text-slate-300">Days to Exp</TableHead>
                  <TableHead className="text-slate-300">Expiration Date</TableHead>
                  <TableHead className="text-slate-300">Current Value</TableHead>
                  <TableHead className="text-slate-300">P&L</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {expiringPositions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                        No positions expiring in the next 7 days
                      </TableCell>
                    </TableRow>
                  ) : (
                    expiringPositions.map((position, index) => {
                      const daysToExp = getDaysToExpiration(position.expiration_date);
                      const urgency = getExpirationUrgency(daysToExp);
                      const isExpToday = isToday(new Date(position.expiration_date));

                      return (
                        <motion.tr
                          key={position.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{position.symbol || 'N/A'}</span>
                              <Badge className={position.option_type === 'call' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                                {(position.option_type || 'unknown').toUpperCase()}
                              </Badge>
                              <span className="text-slate-300">${(position.strike_price || 0)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={urgencyColors[urgency]}>
                              {daysToExp === 0 ? 'Today' : `${daysToExp} day${daysToExp !== 1 ? 's' : ''}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`${isExpToday ? 'text-orange-400 font-semibold' : 'text-slate-300'}`}>
                              {position.expiration_date ? format(new Date(position.expiration_date), 'MMM dd, yyyy') : 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-white font-medium">
                              ${((position.current_value || 0) * (position.contracts || 1)).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {(position.profit_loss || 0) >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-400" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-400" />
                              )}
                              <span className={`font-semibold ${(position.profit_loss || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {(position.profit_loss || 0) >= 0 ? '+' : ''}${Math.abs(position.profit_loss || 0).toLocaleString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {urgency === 'critical' || isExpToday ? (
                              <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                                Action Needed
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                Monitor
                              </Badge>
                            )}
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
    </div>
  );
}
