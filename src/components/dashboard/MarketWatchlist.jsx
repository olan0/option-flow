import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

export default function MarketWatchlist({ watchlist, isLoading }) {
  return (
    <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
      <CardHeader className="border-b border-slate-700/50">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-white">Asset Prices</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          <AnimatePresence>
            {isLoading ? (
              Array(2).fill(0).map((_, i) => (
                <div key={i} className="p-4 border-b border-slate-700/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <Skeleton className="h-4 w-16 mb-2 bg-slate-700" />
                      <Skeleton className="h-3 w-24 bg-slate-700" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-20 mb-2 bg-slate-700" />
                      <Skeleton className="h-3 w-16 bg-slate-700" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              watchlist.map((stock, index) => {
                // Safe data extraction
                const currentPrice = typeof stock?.current_price === 'number' ? stock.current_price : 0;
                const priceChange = typeof stock?.price_change === 'number' ? stock.price_change : 0;
                const priceChangePercent = typeof stock?.price_change_percent === 'number' ? stock.price_change_percent : 0;
                const impliedVolatility = typeof stock?.implied_volatility === 'number' ? stock.implied_volatility : 0;

                return (
                  <motion.div
                    key={stock?.symbol || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white text-lg">{stock?.symbol || 'N/A'}</span>
                          <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                            IV: {impliedVolatility.toFixed(0)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 truncate max-w-48">
                          {stock?.company_name || stock?.symbol || 'Unknown'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white text-lg">
                          ${currentPrice.toLocaleString(undefined, { 
                            minimumFractionDigits: stock?.symbol === 'STX' ? 2 : 0, 
                            maximumFractionDigits: stock?.symbol === 'STX' ? 2 : 0 
                          })}
                        </p>
                        <div className="flex items-center justify-end gap-1">
                          {priceChange >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          <span className={`text-sm font-medium ${
                            priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {priceChangePercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}