'use client';

import { useEffect, useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';

interface Holding {
  id: number;
  ticker: string;
  name: string;
  assetType: string;
  currency: string;
  quantity: number;
  avgCost: string;
  costBasis: string;
  currentPrice: string;
  currentValue: string;
  currentValueAUD: string;
  unrealisedGainAUD: string;
  gainPercent: string;
}

interface Summary {
  totalValueAUD: string;
  totalCostAUD: string;
  totalGainAUD: string;
  totalGainPercent: string;
  sharesValueAUD: string;
  etfsValueAUD: string;
  cryptoValueAUD: string;
  usdToAudRate: string;
}

export default function PortfolioDashboard() {
  const [data, setData] = useState<{ summary: Summary; holdings: Holding[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/portfolio')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch portfolio data');
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">Loading Portfolio Valuation...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <p className="text-lg text-red-600 font-medium">Error: {error || 'No data returned'}</p>
      </div>
    );
  }

  const { summary, holdings } = data;
  const isPositiveGain = parseFloat(summary.totalGainAUD) >= 0;

  const sortedByGain = [...holdings].sort(
    (a, b) => parseFloat(b.gainPercent) - parseFloat(a.gainPercent)
  );

  const topPerformer = sortedByGain.length > 0 ? sortedByGain[0] : null;
  const worstPerformer = sortedByGain.length > 1 ? sortedByGain[sortedByGain.length - 1] : null;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 max-w-7xl mx-auto space-y-6 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Portfolio Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Live Valuation & Asset Category Breakdown</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold block">USD / AUD FX</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">1 USD = A${summary.usdToAudRate}</span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Value */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Value</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">A${Number(summary.totalValueAUD).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Cost: A${Number(summary.totalCostAUD).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</p>
        </div>

        {/* Shares */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Shares</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">A${Number(summary.sharesValueAUD).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{((parseFloat(summary.sharesValueAUD) / parseFloat(summary.totalValueAUD)) * 100 || 0).toFixed(1)}% of Portfolio</p>
        </div>

        {/* ETFs */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">ETFs</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">A${Number(summary.etfsValueAUD).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{((parseFloat(summary.etfsValueAUD) / parseFloat(summary.totalValueAUD)) * 100 || 0).toFixed(1)}% of Portfolio</p>
        </div>

        {/* Crypto */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Crypto</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">A${Number(summary.cryptoValueAUD).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{((parseFloat(summary.cryptoValueAUD) / parseFloat(summary.totalValueAUD)) * 100 || 0).toFixed(1)}% of Portfolio</p>
        </div>

        {/* Total Gain / Loss */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Unrealised Gain</p>
          <p className={`text-2xl font-black mt-1 ${isPositiveGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {isPositiveGain ? '+' : ''}A${Number(summary.totalGainAUD).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
          </p>
          <p className={`text-xs font-semibold mt-1 ${isPositiveGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {isPositiveGain ? '▲' : '▼'} {summary.totalGainPercent}% Overall
          </p>
        </div>
      </div>

      {/* Outperformer Highlights Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Performer */}
        {topPerformer && (
          <div className="bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-lg">
                🚀
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/80 px-2 py-0.5 rounded">Top Performer</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{topPerformer.assetType}</span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mt-0.5">{topPerformer.ticker} - {topPerformer.name}</h3>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">+{topPerformer.gainPercent}%</p>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">+A${Number(topPerformer.unrealisedGainAUD).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        )}

        {/* Worst Performer */}
        {worstPerformer && (
          <div className="bg-gradient-to-r from-rose-50 to-white dark:from-rose-950/40 dark:to-slate-900 p-4 rounded-xl border border-rose-200 dark:border-rose-800/60 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold flex items-center justify-center text-lg">
                ⚠️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider bg-rose-100 dark:bg-rose-900/80 px-2 py-0.5 rounded">Lowest Performer</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{worstPerformer.assetType}</span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mt-0.5">{worstPerformer.ticker} - {worstPerformer.name}</h3>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-lg font-black ${parseFloat(worstPerformer.gainPercent) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {parseFloat(worstPerformer.gainPercent) >= 0 ? '+' : ''}{worstPerformer.gainPercent}%
              </p>
              <p className={`text-xs font-medium ${parseFloat(worstPerformer.unrealisedGainAUD) >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                {parseFloat(worstPerformer.unrealisedGainAUD) >= 0 ? '+A$' : '-A$'}{Math.abs(Number(worstPerformer.unrealisedGainAUD)).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Holdings Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Active Holdings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4 text-right">Units</th>
                <th className="py-3 px-4 text-right">Avg Cost</th>
                <th className="py-3 px-4 text-right">Live Price</th>
                <th className="py-3 px-4 text-right">Valuation (AUD)</th>
                <th className="py-3 px-4 text-right">Gain / Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {holdings.map((h) => {
                const gainNum = parseFloat(h.unrealisedGainAUD);
                const isGain = gainNum >= 0;
                const isTop = topPerformer && h.id === topPerformer.id;
                const isWorst = worstPerformer && h.id === worstPerformer.id;

                let rowBg = 'hover:bg-slate-50 dark:hover:bg-slate-800/50';
                if (isTop) rowBg = 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40';
                if (isWorst) rowBg = 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/40';

                return (
                  <tr key={h.id} className={`${rowBg} transition-colors`}>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <span>{h.ticker}</span>
                        {isTop && <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-200 dark:bg-emerald-900 px-1.5 py-0.5 rounded">TOP</span>}
                        {isWorst && <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 bg-rose-200 dark:bg-rose-900 px-1.5 py-0.5 rounded">LOWEST</span>}
                      </div>
                      <div className="text-xs font-normal text-slate-400 dark:text-slate-500">{h.name}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">{h.quantity}</td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{h.currency === 'USD' ? '$' : 'A$'}{h.avgCost}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-slate-100">{h.currency === 'USD' ? '$' : 'A$'}{h.currentPrice}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">A${Number(h.currentValueAUD).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</td>
                    <td className={`py-3 px-4 text-right font-semibold ${isGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isGain ? '+' : ''}A${Number(h.unrealisedGainAUD).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                      <span className="text-xs block font-normal">{h.gainPercent}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
