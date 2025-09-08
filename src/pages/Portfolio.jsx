import React, { useState, useEffect } from "react";
import { OptionsPosition } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Filter,
  BarChart3,
  PieChart,
  Target
} from "lucide-react";

import PortfolioSummary from "../components/portfolio/PortfolioSummary";
import PositionsList from "../components/portfolio/PositionsList";
import PortfolioAnalytics from "../components/portfolio/PortfolioAnalytics";
import AddPositionModal from "../components/portfolio/AddPositionModal";
import PortfolioFilters from "../components/portfolio/PortfolioFilters";
import PriceDataProvider, { usePriceData } from "../components/dashboard/PriceDataProvider";

function PortfolioContent() {
  const [positions, setPositions] = useState([]);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    symbol: 'all',
    strategy: 'all',
    expiration: 'all'
  });
  
  const { sBTC, STX, loading: priceLoading } = usePriceData();

  useEffect(() => {
    loadPositions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [positions, filters]);

  const loadPositions = async () => {
    setIsLoading(true);
    try {
      const allPositions = await OptionsPosition.list('-created_date');
      setPositions(allPositions);
    } catch (error) {
      console.error("Error loading positions:", error);
    }
    setIsLoading(false);
  };

  const applyFilters = () => {
    let filtered = positions;

    if (filters.status !== 'all') {
      filtered = filtered.filter(pos => pos.status === filters.status);
    }

    if (filters.symbol !== 'all') {
      filtered = filtered.filter(pos => pos.symbol === filters.symbol);
    }

    if (filters.strategy !== 'all') {
      filtered = filtered.filter(pos => pos.strategy_type === filters.strategy);
    }

    if (filters.expiration !== 'all') {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      filtered = filtered.filter(pos => {
        const expDate = new Date(pos.expiration_date);
        switch (filters.expiration) {
          case 'this_week':
            return expDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          case 'this_month':
            return expDate <= thirtyDaysFromNow;
          case 'expired':
            return expDate < now;
          default:
            return true;
        }
      });
    }

    setFilteredPositions(filtered);
  };

  const handleAddPosition = async (positionData) => {
    try {
      await OptionsPosition.create(positionData);
      setShowAddModal(false);
      await loadPositions();
    } catch (error) {
      console.error("Error adding position:", error);
    }
  };

  const handleUpdatePosition = async (id, updateData) => {
    try {
      await OptionsPosition.update(id, updateData);
      await loadPositions();
    } catch (error) {
      console.error("Error updating position:", error);
    }
  };

  const portfolioValue = filteredPositions.reduce((sum, pos) => 
    sum + (pos.current_value || 0) * (pos.contracts || 0), 0
  );
  
  const totalPnL = filteredPositions.reduce((sum, pos) => 
    sum + (pos.profit_loss || 0), 0
  );

  const totalInvested = filteredPositions.reduce((sum, pos) => 
    sum + (pos.premium_paid || 0) * (pos.contracts || 0), 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Portfolio Management</h1>
            <p className="text-slate-400 text-lg">Track and manage your options positions</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Position
            </Button>
          </div>
        </div>

        {/* Portfolio Summary */}
        <PortfolioSummary 
          portfolioValue={portfolioValue}
          totalPnL={totalPnL}
          totalInvested={totalInvested}
          positionsCount={filteredPositions.length}
          isLoading={isLoading}
        />

        {/* Main Content */}
        <Tabs defaultValue="positions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-700/30">
            <TabsTrigger value="positions" className="data-[state=active]:bg-blue-500/30">
              <Briefcase className="w-4 h-4 mr-2" />
              Positions
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-green-500/30">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-purple-500/30">
              <TrendingUp className="w-4 h-4 mr-2" />
              Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="positions" className="mt-6">
            <div className="space-y-6">
              <PortfolioFilters 
                filters={filters}
                onFiltersChange={setFilters}
                positions={positions}
              />
              <PositionsList 
                positions={filteredPositions}
                onUpdatePosition={handleUpdatePosition}
                isLoading={isLoading}
                currentPrices={{ sBTC, STX }}
              />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <PortfolioAnalytics 
              positions={filteredPositions}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Advanced performance analytics coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Position Modal */}
      {showAddModal && (
        <AddPositionModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddPosition}
          currentPrices={{ sBTC, STX }}
        />
      )}
    </div>
  );
}

export default function Portfolio() {
  return (
    <PriceDataProvider>
      <PortfolioContent />
    </PriceDataProvider>
  );
}