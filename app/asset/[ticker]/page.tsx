'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import ThemeToggle from '@/components/ThemeToggle';
import { usePortfolio } from '@/context/PortfolioContext';

export default function AssetDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const resolvedParams = use(params);
  const rawParam = resolvedParams?.ticker || '';
  const targetQuery = decodeURIComponent(rawParam).trim().toUpperCase().replace('.AX', '');

  const contextData = usePortfolio() as any;
  const [portfolioPayload, setPortfolioPayload] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadPortfolio() {
      try {
        const res = await fetch('/api/portfolio');
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setPortfolioPayload(json);
        }
      } catch (err) {
        console.error('Failed fetching asset details from /api/portfolio', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadPortfolio();
    return () => { isMounted = false; };
  }, []);

  const holdingsList: any[] = 
    Array.isArray(portfolioPayload?.holdings) ? portfolioPayload.holdings :
    Array.isArray(contextData?.holdings) ? contextData.holdings :
    Array.isArray(portfolioPayload) ? portfolioPayload :
    Array.isArray(contextData) ? contextData : [];

  const holding = holdingsList.find((h: any) => {
    if (!h) return false;
    const itemTicker = String(h.ticker || h.symbol || h.code || '').trim().toUpperCase().replace('.AX', '');
    const itemId = String(h.id || '');
    return itemTicker === targetQuery || itemId === targetQuery;
  });

  const ticker = (holding?.ticker || targetQuery || 'ASSET').toUpperCase().replace('.AX', '');
  const companyName = holding?.name || ticker;

  const sharesOwned = Number(
    holding?.quantity ?? 
    holding?.units ?? 
    holding?.shares ?? 
    0
  );

  const directHoldingPrice = Number(holding?.currentPrice ?? holding?.marketPrice ?? 0);
  const avgCostPrice = Number(holding?.avgCost ?? holding?.avgPrice ?? 0);
  const basePrice = directHoldingPrice > 0 ? directHoldingPrice : avgCostPrice;

  const [tradeQuantity, setTradeQuantity] = useState<number>(sharesOwned);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');

  useEffect(() => {
    setTradeQuantity(sharesOwned);
  }, [sharesOwned]);

  const [drpEnabled, setDrpEnabled] = useState<boolean>(true);
  const [paidDate, setPaidDate] = useState<string>('2026-09-28');
  const [estDps, setEstDps] = useState<number>(0.97);
  const [frankingPct, setFrankingPct] = useState<number>(100);

  const chartData = [
    { day: 'Mon', price: Number((basePrice * 0.975).toFixed(2)) },
    { day: 'Tue', price: Number((basePrice * 0.988).toFixed(2)) },
    { day: 'Wed', price: Number((basePrice * 0.982).toFixed(2)) },
    { day: 'Thu', price: Number((basePrice * 1.012).toFixed(2)) },
    { day: 'Fri', price: Number((basePrice * 0.995).toFixed(2)) },
    { day: 'Sat', price: Number((basePrice * 1.008).toFixed(2)) },
    { day: 'Today', price: Number(basePrice.toFixed(2)) },
  ];

  const grossCash = sharesOwned * estDps;
  const frankingCredit = grossCash * (30 / 70) * (frankingPct / 100);
  const totalAssessable = grossCash + frankingCredit;

  const handleTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (tradeQuantity <= 0 || basePrice <= 0) return;
    if (contextData?.executeTrade) {
      contextData.executeTrade(ticker, tradeQuantity, tradeType, basePrice);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-8 space-y-8 transition-colors duration-200">
      <div className="flex justify-between items-center">
        <Link href="/" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
          ← Back to Portfolio
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {ticker} {companyName && companyName !== ticker ? `- ${companyName}` : ''}
          </h1>
          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mt-1">
            <p>
              Market Price: <span className="font-semibold text-slate-900 dark:text-slate-100">${basePrice.toFixed(2)} AUD</span>
            </p>
            {avgCostPrice > 0 && (
              <p>
                Avg Purchase Cost: <span className="font-semibold text-slate-900 dark:text-slate-100">${avgCostPrice.toFixed(2)} AUD</span>
              </p>
            )}
          </div>
        </div>
        
        <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-lg px-5 py-3">
          <span className="text-sm text-slate-600 dark:text-slate-300">Your Holdings: </span>
          {loading && holdingsList.length === 0 ? (
            <span className="text-sm text-slate-400 animate-pulse ml-2">Loading...</span>
          ) : (
            <>
              <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 ml-1">
                {sharesOwned.toLocaleString()} units
              </span>
              <span className="text-xs text-slate-500 block sm:inline sm:ml-2">
                (${(sharesOwned * basePrice).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="text-lg font-bold">Price Performance Trend</h2>

          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" stroke="#888888" />
                <YAxis domain={['auto', 'auto']} stroke="#888888" tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(value: any) => [`$${Number(value).toFixed(2)} AUD`, 'Price']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPrice)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold mb-4">Adjust Position</h2>

            <form onSubmit={handleTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTradeType('buy')}
                  className={`py-2 text-sm font-semibold rounded-md transition-all ${
                    tradeType === 'buy' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setTradeType('sell')}
                  className={`py-2 text-sm font-semibold rounded-md transition-all ${
                    tradeType === 'sell' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Remove
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Units</label>
                <input
                  type="number"
                  min="1"
                  value={tradeQuantity}
                  onChange={(e) => setTradeQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 text-sm text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Total Value:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  ${(tradeQuantity * basePrice).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <button
                type="submit"
                className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${
                  tradeType === 'buy' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {tradeType === 'buy' ? `Add ${ticker} Units` : `Remove ${ticker} Units`}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div className="flex flex-wrap justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Dividend Tax Breakdown</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Calculated on {sharesOwned} units held</p>
          </div>

          <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">DRP Reinvestment Active</span>
            <button
              onClick={() => setDrpEnabled(!drpEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                drpEnabled ? 'bg-emerald-600' : 'bg-slate-400'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  drpEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Payment Date</label>
            <input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Est. Dividend Per Share ($)</label>
            <input
              type="number"
              step="0.01"
              value={estDps}
              onChange={(e) => setEstDps(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Franking Level (%)</label>
            <input
              type="number"
              value={frankingPct}
              onChange={(e) => setFrankingPct(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="bg-slate-100 dark:bg-slate-900/80 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-700 pb-2">
            <span>ATO ESTIMATED DIVIDEND STATEMENT</span>
            <span className="uppercase text-indigo-600 dark:text-indigo-400 font-bold">
              {drpEnabled ? 'DRP Active' : 'Cash Paid'}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Gross Cash Dividend ({sharesOwned} shares @ ${estDps}/sh):</span>
            <span className="font-semibold text-slate-900 dark:text-white">${grossCash.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Franking Credit Tax Offset ({frankingPct}%):</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">${frankingCredit.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-700 font-bold">
            <span className="text-slate-800 dark:text-slate-200">Total Assessable Income:</span>
            <span className="text-indigo-600 dark:text-indigo-400">${totalAssessable.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
