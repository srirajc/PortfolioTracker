'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Holding {
  ticker: string;
  name: string;
  units: number;
  avgPrice: number;
  currentPrice: number;
}

interface PortfolioContextType {
  holdings: Holding[];
  updateHoldingQuantity: (ticker: string, newUnits: number) => void;
  executeTrade: (ticker: string, quantity: number, type: 'buy' | 'sell', price: number) => void;
}

const STORAGE_KEY = 'portfolio_holdings_v1';

const INITIAL_HOLDINGS: Holding[] = [
  { ticker: 'VDHG', name: 'Vanguard Diversified High Growth', units: 250, avgPrice: 58.50, currentPrice: 63.95 },
  { ticker: 'VAS', name: 'Vanguard Australian Shares Index', units: 140, avgPrice: 88.20, currentPrice: 94.10 },
  { ticker: 'IVV', name: 'iShares S&P 500 ETF', units: 85, avgPrice: 420.00, currentPrice: 485.30 },
  { ticker: 'BHP', name: 'BHP Group Limited', units: 60, avgPrice: 41.10, currentPrice: 43.80 },
];

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHoldings(JSON.parse(saved));
      } else {
        setHoldings(INITIAL_HOLDINGS);
      }
    } catch {
      setHoldings(INITIAL_HOLDINGS);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
    }
  }, [holdings, isLoaded]);

  const updateHoldingQuantity = (ticker: string, newUnits: number) => {
    setHoldings((prevHoldings) =>
      prevHoldings
        .map((holding) => {
          if (holding.ticker.toUpperCase() === ticker.toUpperCase()) {
            return { ...holding, units: Math.max(0, newUnits) };
          }
          return holding;
        })
        .filter((holding) => holding.units > 0)
    );
  };

  const executeTrade = (
    ticker: string,
    quantity: number,
    type: 'buy' | 'sell',
    price: number
  ) => {
    if (quantity <= 0) return;

    setHoldings((prevHoldings) => {
      const existingIndex = prevHoldings.findIndex(
        (h) => h.ticker.toUpperCase() === ticker.toUpperCase()
      );

      if (existingIndex >= 0) {
        const current = prevHoldings[existingIndex];
        let updatedUnits = current.units;
        let updatedAvgPrice = current.avgPrice;

        if (type === 'buy') {
          const totalCost = current.units * current.avgPrice + quantity * price;
          updatedUnits = current.units + quantity;
          updatedAvgPrice = totalCost / updatedUnits;
        } else {
          updatedUnits = Math.max(0, current.units - quantity);
        }

        if (updatedUnits === 0) {
          return prevHoldings.filter((_, idx) => idx !== existingIndex);
        }

        const updatedHoldings = [...prevHoldings];
        updatedHoldings[existingIndex] = {
          ...current,
          units: updatedUnits,
          avgPrice: updatedAvgPrice,
          currentPrice: price,
        };

        return updatedHoldings;
      } else if (type === 'buy') {
        return [
          ...prevHoldings,
          {
            ticker: ticker.toUpperCase(),
            name: `${ticker.toUpperCase()} Asset`,
            units: quantity,
            avgPrice: price,
            currentPrice: price,
          },
        ];
      }

      return prevHoldings;
    });
  };

  return (
    <PortfolioContext.Provider
      value={{
        holdings,
        updateHoldingQuantity,
        executeTrade,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}
