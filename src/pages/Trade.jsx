
import React, { useState, useEffect } from "react";
import { LiquidityPool, AMMTrade, LiquidityPosition } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Coins,
  TrendingUp,
  Droplets,
  Activity,
  Zap,
  Target,
  Bitcoin,
  Layers
} from "lucide-react";

import AmmMetricCard from "../components/amm/AmmMetricCard";
import LiquidityInterface from "../components/amm/LiquidityInterface";
import PoolAnalytics from "../components/amm/PoolAnalytics";
import ContractInteraction from "../components/amm/ContractInteraction";
import PriceDataProvider, { usePriceData } from "../components/dashboard/PriceDataProvider";
import OptionChain from "../components/amm/OptionChain";
import TradeTicket from "../components/amm/TradeTicket";

function TradeContent() {
  const [pools, setPools] = useState([]);
  const [trades, setTrades] = useState([]);
  const [liquidityPositions, setLiquidityPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("trade");

  const [selectedAsset, setSelectedAsset] = useState('sBTC');
  const [expirationDates, setExpirationDates] = useState([]);
  const [selectedExpiration, setSelectedExpiration] = useState('');

  const [selectedContract, setSelectedContract] = useState(null);
  const [tradeType, setTradeType] = useState('buy');
  const [showTradeTicket, setShowTradeTicket] = useState(false);

  const { sBTC, STX, loading: priceLoading } = usePriceData();

  useEffect(() => {
    loadAMMData();
  }, []);

  useEffect(() => {
    console.log('Pools loaded:', pools.length, 'pools');
    console.log('Selected asset:', selectedAsset);
    
    if (pools && pools.length > 0) {
      const assetPools = pools.filter(p => p.underlying_asset === selectedAsset);
      console.log(`Pools for ${selectedAsset}:`, assetPools.length);
      
      const expiries = [...new Set(
        assetPools.map(p => p.expiration_timestamp)
      )].sort((a, b) => a - b);
      
      console.log('Available expiries:', expiries);
      setExpirationDates(expiries);

      if (expiries.length > 0) {
        // If the currently selected expiration isn't valid for the new asset,
        // or if no expiration is selected, default to the first one in the list.
        if (!selectedExpiration || !expiries.includes(selectedExpiration)) {
          console.log('Setting expiration to:', expiries[0]);
          setSelectedExpiration(expiries[0]);
        }
      } else {
        // If there are no valid expirations for the selected asset, clear the selection.
        console.log('No expiries found for this asset, clearing selection');
        setSelectedExpiration('');
      }
    } else {
      // If there are no pools at all, clear the expiration dates and selection.
      setExpirationDates([]);
      setSelectedExpiration('');
    }
  }, [pools, selectedAsset, selectedExpiration]);

  const loadAMMData = async () => {
    setIsLoading(true);
    try {
      const [poolsData, tradesData, positionsData] = await Promise.all([
        LiquidityPool.list('-total_liquidity'),
        AMMTrade.list('-timestamp', 20),
        LiquidityPosition.list('-entry_timestamp', 10)
      ]);

      console.log('Raw pools data:', poolsData);
      setPools(poolsData || []);
      setTrades(tradesData || []);
      setLiquidityPositions(positionsData || []);
    } catch (error) {
      console.error("Error loading AMM data:", error);
      setPools([]);
      setTrades([]);
      setLiquidityPositions([]);
    }
    setIsLoading(false);
  };

  const handleSelectContract = (contract, type) => {
    setSelectedContract(contract);
    setTradeType(type);
    setShowTradeTicket(true);
  };

  const totalLiquidity = pools.reduce((sum, pool) => sum + (pool.total_liquidity || 0), 0);
  const totalVolume = pools.reduce((sum, pool) => sum + (pool.total_volume || 0), 0);
  const activePools = pools.filter(pool => pool.is_active).length;

  const filteredPoolsForChain = pools.filter(p => 
    p.underlying_asset === selectedAsset && 
    p.expiration_timestamp === selectedExpiration
  );
  
  console.log('Filtered pools for chain:', filteredPoolsForChain.length, 'pools');
  console.log('Selected expiration:', selectedExpiration);

  const currentPrices = {
      sBTC: sBTC?.current_price || 0,
      STX: STX?.current_price || 0
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Options Trading</h1>
            <p className="text-slate-400 text-lg">Trade options directly on-chain via the Automated Market Maker</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
              <Zap className="w-3 h-3 mr-1" />
              Powered by Clarity
            </Badge>
          </div>
        </div>

        {/* AMM Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AmmMetricCard
            title="Total Liquidity"
            value={`$${(totalLiquidity/1000000).toFixed(2)}M`}
            change="+12.5%"
            icon={Droplets}
            gradient="from-blue-500 to-blue-600"
            isPositive={true}
          />
          <AmmMetricCard
            title="24h Volume"
            value={`$${(totalVolume/1000).toFixed(1)}k`}
            change="+8.3%"
            icon={Activity}
            gradient="from-green-500 to-green-600"
            isPositive={true}
          />
          <AmmMetricCard
            title="Active Pools"
            value={activePools.toString()}
            change={`${pools.length} total`}
            icon={Target}
            gradient="from-purple-500 to-purple-600"
            isPositive={true}
          />
          <AmmMetricCard
            title="Avg LP APY"
            value="24.5%"
            change="Based on fees"
            icon={TrendingUp}
            gradient="from-orange-500 to-orange-600"
            isPositive={true}
          />
        </div>

        {/* Main AMM Interface */}
        <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-700/30 m-4 mb-0">
                <TabsTrigger value="trade" className="data-[state=active]:bg-blue-500/30">
                  Trade
                </TabsTrigger>
                <TabsTrigger value="liquidity" className="data-[state=active]:bg-green-500/30">
                  Provide Liquidity
                </TabsTrigger>
                <TabsTrigger value="contracts" className="data-[state=active]:bg-purple-500/30">
                  Smart Contracts
                </TabsTrigger>
              </TabsList>

              <TabsContent value="trade" className="mt-0">
                <div className="p-4 border-b border-slate-700/50 flex items-center gap-4 bg-slate-900/20">
                    <div className="flex items-center gap-2">
                        <Button variant={selectedAsset === 'sBTC' ? 'secondary' : 'ghost'} onClick={() => setSelectedAsset('sBTC')} className="gap-2"><Bitcoin className="w-4 h-4 text-orange-400"/>sBTC</Button>
                        <Button variant={selectedAsset === 'STX' ? 'secondary' : 'ghost'} onClick={() => setSelectedAsset('STX')} className="gap-2"><Layers className="w-4 h-4 text-purple-400"/>STX</Button>
                    </div>
                    <Select value={selectedExpiration} onValueChange={setSelectedExpiration}>
                        <SelectTrigger className="w-[280px] bg-slate-700/50 border-slate-600 text-white">
                            <SelectValue placeholder="Select expiration date" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                            {expirationDates.map(ts => (
                                <SelectItem key={ts} value={ts} className="text-white hover:bg-slate-700">
                                    {new Date(ts * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {/* Debug info */}
                    <div className="text-xs text-slate-400">
                      Pools: {pools.length} | Asset Pools: {filteredPoolsForChain.length} | Exp: {selectedExpiration}
                    </div>
                </div>
                <OptionChain
                    pools={filteredPoolsForChain}
                    onSelectContract={handleSelectContract}
                    isLoading={isLoading || priceLoading}
                    currentPrices={currentPrices}
                />
              </TabsContent>

              <TabsContent value="liquidity" className="mt-0 p-6">
                <LiquidityInterface
                  selectedPool={pools[0]}
                  pools={pools}
                  onPoolSelect={() => {}}
                  onLiquidityAdded={loadAMMData}
                />
              </TabsContent>

              <TabsContent value="contracts" className="mt-0 p-6">
                <ContractInteraction
                  selectedPool={pools[0]}
                  pools={pools}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {showTradeTicket && selectedContract && (
        <TradeTicket
            contract={selectedContract}
            tradeType={tradeType}
            onClose={() => setShowTradeTicket(false)}
            onTradeComplete={loadAMMData}
            currentPrices={currentPrices}
        />
      )}
    </div>
  );
}

export default function TradePage() {
    return (
        <PriceDataProvider>
            <TradeContent />
        </PriceDataProvider>
    );
}
