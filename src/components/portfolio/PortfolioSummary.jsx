import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Target, Briefcase, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function PortfolioSummary({ 
  portfolioValue, 
  totalPnL, 
  totalInvested, 
  positionsCount, 
  isLoading 
}) {
  const portfolioReturn = totalInvested > 0 ? ((portfolioValue - totalInvested) / totalInvested * 100) : 0;

  const summaryItems = [
    {
      title: "Portfolio Value",
      value: `$${portfolioValue.toLocaleString()}`,
      icon: DollarSign,
      gradient: "from-blue-500 to-blue-600",
      isPositive: true
    },
    {
      title: "Total P&L",
      value: `${totalPnL >= 0 ? '+' : ''}$${Math.abs(totalPnL).toLocaleString()}`,
      icon: totalPnL >= 0 ? TrendingUp : TrendingDown,
      gradient: totalPnL >= 0 ? "from-green-500 to-green-600" : "from-red-500 to-red-600",
      isPositive: totalPnL >= 0
    },
    {
      title: "Total Invested",
      value: `$${totalInvested.toLocaleString()}`,
      icon: Target,
      gradient: "from-purple-500 to-purple-600",
      isPositive: true
    },
    {
      title: "Portfolio Return",
      value: `${portfolioReturn >= 0 ? '+' : ''}${portfolioReturn.toFixed(2)}%`,
      icon: Activity,
      gradient: portfolioReturn >= 0 ? "from-green-500 to-green-600" : "from-red-500 to-red-600",
      isPositive: portfolioReturn >= 0
    },
    {
      title: "Active Positions",
      value: positionsCount.toString(),
      icon: Briefcase,
      gradient: "from-orange-500 to-orange-600",
      isPositive: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {summaryItems.map((item, index) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <Card className="relative overflow-hidden bg-slate-800/50 backdrop-blur-xl border-slate-700/50 hover:bg-slate-800/70 transition-all duration-300">
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${item.gradient} rounded-full opacity-10 transform translate-x-4 -translate-y-4`} />
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-400 mb-2">{item.title}</p>
                  {isLoading ? (
                    <Skeleton className="h-6 w-20 bg-slate-700" />
                  ) : (
                    <p className={`text-xl font-bold ${item.isPositive ? 'text-white' : 'text-white'}`}>
                      {item.value}
                    </p>
                  )}
                </div>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${item.gradient} shadow-lg`}>
                  <item.icon className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}