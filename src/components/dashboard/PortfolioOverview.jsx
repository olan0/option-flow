import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function PortfolioOverview({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  gradient,
  isPositive,
  isLoading = false
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden bg-slate-800/50 backdrop-blur-xl border-slate-700/50 hover:bg-slate-800/70 transition-all duration-300">
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} rounded-full opacity-10 transform translate-x-6 -translate-y-6`} />
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-400 mb-2">{title}</p>
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-24 mb-2 bg-slate-700" />
                  <Skeleton className="h-4 w-16 bg-slate-700" />
                </>
              ) : (
                <>
                  <p className="text-2xl md:text-3xl font-bold text-white mb-2">{value}</p>
                  <p className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {change}
                  </p>
                </>
              )}
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}