import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, ShieldAlert, ShieldHalf, Activity } from "lucide-react";

export default function PoolHealthIndicator({ pool }) {
  if (!pool) return null;

  const {
    total_liquidity = 0,
    total_open_interest = 0,
    max_open_interest_ratio = 0.8,
    collateralization_ratio = 1.25
  } = pool;

  const utilization = total_liquidity > 0 ? (total_open_interest / total_liquidity) * 100 : 0;
  const maxUtilization = max_open_interest_ratio * 100;

  const getHealthStatus = () => {
    const usagePercentage = utilization / maxUtilization;
    if (usagePercentage > 0.9) {
      return {
        level: 'Risky',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        icon: ShieldAlert
      };
    }
    if (usagePercentage > 0.7) {
      return {
        level: 'Caution',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/30',
        icon: ShieldHalf
      };
    }
    return {
      level: 'Healthy',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      icon: ShieldCheck
    };
  };

  const health = getHealthStatus();
  const HealthIcon = health.icon;

  return (
    <Card className={`border ${health.borderColor} ${health.bgColor}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className={`font-semibold mb-2 flex items-center gap-2 ${health.color}`}>
              <HealthIcon className="w-5 h-5" />
              Pool Health: {health.level}
            </h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-slate-300">Utilization</span>
                  <span className={`font-semibold ${health.color}`}>{utilization.toFixed(2)}% / {maxUtilization.toFixed(0)}%</span>
                </div>
                <Progress value={utilization} max={maxUtilization} className="h-2" />
                <p className="text-xs text-slate-400 mt-1">
                  ${(total_open_interest || 0).toLocaleString()} of ${(total_liquidity || 0).toLocaleString()} capacity used.
                </p>
              </div>
              <div className="text-sm">
                <span className="text-slate-300">Collateralization Ratio: </span>
                <span className="text-white font-semibold">{(collateralization_ratio * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
          <Activity className={`w-10 h-10 ${health.color} opacity-20`} />
        </div>
      </CardContent>
    </Card>
  );
}