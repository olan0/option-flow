
import React, { useState, useEffect } from "react";
import { OptionsPosition } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, Activity, Bitcoin, Layers, RefreshCw } from "lucide-react";
import { Line } from 'recharts';
import { LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

import PortfolioOverview from "../components/dashboard/PortfolioOverview";
import MarketWatchlist from "../components/dashboard/MarketWatchlist";
import RecentPositions from "../components/dashboard/RecentPositions";
import PerformanceChart from "../components/dashboard/PerformanceChart";
import PriceDataProvider, { usePriceData } from "../components/dashboard/PriceDataProvider";

function DashboardContent() {
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { sBTC, STX, loading: priceLoading, lastUpdate, refreshPrices } = usePriceData();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allPositions = await OptionsPosition.list('-created_date');
      const filteredPositions = allPositions.filter(p => p.symbol === 'sBTC' || p.symbol === 'STX');
      setPositions(filteredPositions);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setIsLoading(false);
  };

  const portfolioValue = positions.reduce((sum, pos) => sum + (pos.current_value || 0) * (pos.contracts || 0), 0);
  const totalPnL = positions.reduce((sum, pos) => sum + (pos.profit_loss || 0), 0);
  
  const watchlist = [sBTC, STX].filter(Boolean);

  // Safe value extraction with fallbacks
  const getSafePrice = (asset) => {
    if (!asset || typeof asset.current_price !== 'number') return '---';
    return `$${asset.current_price.toLocaleString()}`;
  };

  const getSafeChange = (asset) => {
    if (!asset || typeof asset.price_change_percent !== 'number') return '---';
    return `${asset.price_change_percent >= 0 ? '+' : ''}${asset.price_change_percent.toFixed(2)}%`;
  };

  const getSafePositive = (asset) => {
    return asset && typeof asset.price_change_percent === 'number' && asset.price_change_percent >= 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">sBTC &amp; STX Options Dashboard</h1>
            <p className="text-slate-400 text-lg">Monitor your sBTC and STX options portfolio</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={refreshPrices}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              disabled={priceLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${priceLoading ? 'animate-spin' : ''}`} />
              Refresh Prices
            </Button>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-slate-300">
                Live Data {lastUpdate && `(${lastUpdate.toLocaleTimeString()})`}
              </span>
            </div>
          </div>
        </div>

        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <PortfolioOverview
            title="sBTC Price"
            value={getSafePrice(sBTC)}
            change={getSafeChange(sBTC)}
            icon={Bitcoin}
            gradient="from-orange-500 to-orange-600"
            isPositive={getSafePositive(sBTC)}
            isLoading={priceLoading}
          />
          <PortfolioOverview
            title="STX Price"
            value={STX && typeof STX.current_price === 'number' 
              ? `$${STX.current_price.toFixed(2)}`
              : '---'}
            change={getSafeChange(STX)}
            icon={Layers}
            gradient="from-purple-500 to-purple-600"
            isPositive={getSafePositive(STX)}
            isLoading={priceLoading}
          />
          <PortfolioOverview
            title="Portfolio Value"
            value={`$${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            change="All Positions"
            icon={DollarSign}
            gradient="from-blue-500 to-blue-600"
            isPositive={true}
            isLoading={isLoading}
          />
          <PortfolioOverview
            title="Total P&amp;L"
            value={`${totalPnL >= 0 ? '+' : ''}$${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            change="Unrealized"
            icon={totalPnL >= 0 ? TrendingUp : TrendingDown}
            gradient={totalPnL >= 0 ? "from-green-500 to-green-600" : "from-red-500 to-red-600"}
            isPositive={totalPnL >= 0}
            isLoading={isLoading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Performance Chart */}
          <div className="lg:col-span-2">
            <PerformanceChart positions={positions} isLoading={isLoading} />
          </div>

          {/* Market Watchlist */}
          <div>
            <MarketWatchlist watchlist={watchlist} isLoading={priceLoading || isLoading} />
          </div>
        </div>

        {/* Recent Positions */}
        <RecentPositions positions={positions} isLoading={isLoading} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <PriceDataProvider>
      <DashboardContent />
    </PriceDataProvider>
  );
}
