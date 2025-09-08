import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
//import { InvokeLLM } from "@/apis/integrations";

const PriceDataContext = createContext();

export function usePriceData() {
  return useContext(PriceDataContext);
}

const coinGeckoIds = {
    sBTC: 'wrapped-bitcoin',
    STX: 'blockstack'
};

const priceSchema = {
    type: "object",
    properties: {
        current_price: { type: "number" },
        price_change_percent: { type: "number" },
        price_change: { type: "number" },
        implied_volatility: {type: "number"},
        company_name: {type: "string"},
    }
};

export default function PriceDataProvider({ children }) {
  const [sBTC, setSBTC] = useState(null);
  const [STX, setSTX] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
        const prompt = `
            Fetch the latest market data for the following assets from CoinGecko:
            1. Asset ID: ${coinGeckoIds.sBTC} (Symbol: sBTC)
            2. Asset ID: ${coinGeckoIds.STX} (Symbol: STX)

            For each asset, provide the following information in a JSON object:
            - current_price (in USD)
            - price_change_percent (for the last 24 hours)
            - price_change (in USD for the last 24 hours)
            - company_name (e.g., "Bitcoin", "Stacks")
            - implied_volatility (Provide a realistic, estimated 30-day implied volatility percentage. For sBTC, use a value between 60-85. For STX, use a value between 80-110).

            Return the result as a JSON object where the keys are the asset symbols (sBTC, STX).
        `;

        const response = await InvokeLLM({
            prompt: prompt,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    sBTC: priceSchema,
                    STX: priceSchema,
                }
            }
        });
        
        if (response.sBTC) {
            setSBTC({ symbol: 'sBTC', ...response.sBTC });
        }
        if (response.STX) {
            setSTX({ symbol: 'STX', ...response.STX });
        }
        
        setLastUpdate(new Date());

    } catch (error) {
      console.error("Failed to fetch live price data:", error);
      // Fallback to mock data on error
      setSBTC({ symbol: 'sBTC', current_price: 68420, price_change_percent: 1.5, price_change: 1026, implied_volatility: 75, company_name: "Bitcoin" });
      setSTX({ symbol: 'STX', current_price: 2.15, price_change_percent: -2.3, price_change: -0.05, implied_volatility: 95, company_name: "Stacks" });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPrices();
    // Set up an interval to refresh prices every 2 minutes
    const interval = setInterval(fetchPrices, 120000); 
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const value = {
    sBTC,
    STX,
    loading,
    lastUpdate,
    refreshPrices: fetchPrices
  };

  return (
    <PriceDataContext.Provider value={value}>
      {children}
    </PriceDataContext.Provider>
  );
}