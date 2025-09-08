import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function RiskMetrics({ title, value, icon: Icon, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">{title}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}