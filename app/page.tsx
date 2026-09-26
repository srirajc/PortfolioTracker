'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import ThemeToggle from '@/components/ThemeToggle';

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
  const [summary, setSummary] = useState<Summary | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for adding a new asset/transaction
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState('STOCKS');
  const [currency, setCurrency] = useState('AUD');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const res = await fetch('/api/portfolio');
      const data = await res.json();
      setSummary(data.summary);
      setHoldings(data.holdings || []);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const assetRes = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, name, asset_type: assetType, currency }),
      });
      const asset = await assetRes.json();

      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_id: asset.id,
          transaction_type: 'BUY',
          quantity: parseFloat(quantity),
          price_per_unit: parseFloat(price),
        }),
      });

      setTicker('');
      setName('');
      setQuantity('');
      setPrice('');
      setShowAddModal(false);
      await fetchPortfolio();
    } catch (err) {
      console.error(err);
      alert('Failed to add holding');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        Loading portfolio data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-8 space-y-8 transition-colors duration-200">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Live Valuation & Asset Breakdown</p>
        </div>
        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold transition text-sm"
          >
            + Add Holding / Units
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 transition text-sm font-medium"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-xs">Total Portfolio Value</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">A${summary.totalValueAUD}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-xs">Total Unrealised Gain</p>
            <p className={`text-2xl font-bold ${Number(summary.totalGainAUD) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              A${summary.totalGainAUD} ({summary.totalGainPercent}%)
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-xs">Shares Value</p>
            <p className="text-2xl font-bold">A${summary.sharesValueAUD}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-xs">ETFs Value</p>
            <p className="text-2xl font-bold">A${summary.etfsValueAUD}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-xs">Crypto Value</p>
            <p className="text-2xl font-bold">A${summary.cryptoValueAUD}</p>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold">Holdings</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase">
            <tr>
              <th className="px-6 py-3">Ticker</th>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Units</th>
              <th className="px-6 py-3">Avg Cost</th>
              <th className="px-6 py-3">Current Price</th>
              <th className="px-6 py-3">Value (AUD)</th>
              <th className="px-6 py-3">Gain / Loss (AUD)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {holdings.map((h) => (
              <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-6 py-3 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  <Link href={`/asset/${h.ticker}`}>
                    {h.ticker} ↗
                  </Link>
                </td>
                <td className="px-6 py-3">{h.name}</td>
                <td className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400">{h.assetType}</td>
                <td className="px-6 py-3">{h.quantity}</td>
                <td className="px-6 py-3">${h.avgCost} {h.currency}</td>
                <td className="px-6 py-3">${h.currentPrice} {h.currency}</td>
                <td className="px-6 py-3 font-semibold">A${h.currentValueAUD}</td>
                <td className={`px-6 py-3 font-semibold ${Number(h.unrealisedGainAUD) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  A${h.unrealisedGainAUD} ({h.gainPercent}%)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Asset API Endpoint Wrapper */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="text-xl font-bold">Add Holding / Asset</h2>
            <form onSubmit={handleAddAsset} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Ticker Symbol</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VAS"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vanguard Australian Shares"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Asset Type</label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
                  >
                    <option value="STOCKS">STOCKS</option>
                    <option value="ETF">ETF</option>
                    <option value="CRYPTO">CRYPTO</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
                  >
                    <option value="AUD">AUD</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Units Quantity</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="10"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Buy Price Per Unit</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="85.50"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 px-4 py-2 rounded text-slate-800 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-white font-semibold"
                >
                  {submitting ? 'Saving...' : 'Add Holding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
