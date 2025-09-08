import React, { useState, useEffect } from "react";
import { OptionsPosition, ExpirationEvent } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, History, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

import ExpirationMonitor from "../components/expiration/ExpirationMonitor";
import ExpirationProcessor from "../components/expiration/ExpirationProcessor";

export default function ExpirationPage() {
  const [positions, setPositions] = useState([]);
  const [expirationEvents, setExpirationEvents] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [processingData, setProcessingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPrices, setCurrentPrices] = useState({ sBTC: 68420, STX: 2.15 });
  const [priceLoading, setPriceLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allPositions, allEvents] = await Promise.all([
        OptionsPosition.list('-expiration_date'),
        ExpirationEvent.list('-processed_at', 50)
      ]);
      
      setPositions(allPositions || []);
      setExpirationEvents(allEvents || []);
    } catch (error) {
      console.error("Error loading expiration data:", error);
    }
    setIsLoading(false);
  };

  const refreshPrices = () => {
    setPriceLoading(true);
    // Simulate price refresh with slight variation
    setTimeout(() => {
      const sBTCVariation = (Math.random() * 2 - 1) / 100; // -1% to +1%
      const stxVariation = (Math.random() * 2 - 1) / 100;
      
      setCurrentPrices(prev => ({
        sBTC: Math.round(prev.sBTC * (1 + sBTCVariation)),
        STX: Number((prev.STX * (1 + stxVariation)).toFixed(2))
      }));
      setPriceLoading(false);
    }, 1000);
  };

  const handleProcessExpiration = (position, intrinsicValue, finalPnL) => {
    const settlementPrice = currentPrices[position.symbol];
    
    setSelectedPosition(position);
    setProcessingData({
      settlementPrice: settlementPrice,
      intrinsicValue: intrinsicValue,
      finalPnL: finalPnL
    });
  };

  const handleConfirmExpiration = async (expirationData) => {
    try {
      // Create expiration event record
      await ExpirationEvent.create(expirationData);
      
      // Update position status to expired
      await OptionsPosition.update(selectedPosition.id, {
        ...selectedPosition,
        status: 'expired',
        profit_loss: expirationData.final_pnl
      });
      
      // Reload data
      await loadData();
      
      // Reset state
      setSelectedPosition(null);
      setProcessingData(null);
    } catch (error) {
      console.error("Error processing expiration:", error);
    }
  };

  const handleCancelProcessing = () => {
    setSelectedPosition(null);
    setProcessingData(null);
  };

  const totalExpired = expirationEvents.length;
  const totalExercised = expirationEvents.filter(e => e.is_exercised).length;
  const totalPnLFromExpirations = expirationEvents.reduce((sum, e) => sum + (e.final_pnl || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Options Expiration Center</h1>
            <p className="text-slate-400 text-lg">Monitor and process option expirations with real-time pricing</p>
          </div>
          <div className="flex items-center gap-3">
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
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300">Settlement Prices</span>
            </div>
          </div>
        </div>

        {/* Real-Time Price Display */}
        <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Current Settlement Prices:</span>
              <div className="flex gap-6">
                <div className="text-center">
                  <span className="text-orange-400 font-semibold">sBTC</span>
                  <p className="text-white font-bold">${(currentPrices.sBTC || 0).toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <span className="text-purple-400 font-semibold">STX</span>
                  <p className="text-white font-bold">${(currentPrices.STX || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-2">Total Expired</p>
                  <p className="text-2xl font-bold text-white">{totalExpired}</p>
                </div>
                <History className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-2">Exercised</p>
                  <p className="text-2xl font-bold text-green-400">{totalExercised}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-2">Total P&L</p>
                  <p className={`text-2xl font-bold ${totalPnLFromExpirations >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalPnLFromExpirations >= 0 ? '+' : ''}${(totalPnLFromExpirations || 0).toLocaleString()}
                  </p>
                </div>
                <AlertTriangle className={`w-8 h-8 ${totalPnLFromExpirations >= 0 ? 'text-green-400' : 'text-red-400'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {selectedPosition && processingData ? (
          <ExpirationProcessor
            position={selectedPosition}
            settlementPrice={processingData.settlementPrice}
            intrinsicValue={processingData.intrinsicValue}
            finalPnL={processingData.finalPnL}
            onConfirm={handleConfirmExpiration}
            onCancel={handleCancelProcessing}
          />
        ) : (
          <Tabs defaultValue="monitor" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-700/30">
              <TabsTrigger value="monitor" className="data-[state=active]:bg-blue-500/30">
                Expiration Monitor
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-purple-500/30">
                Expiration History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="monitor" className="mt-6">
              <ExpirationMonitor 
                positions={positions} 
                onProcessExpiration={handleProcessExpiration}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">Expiration History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400">Expiration history component coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}