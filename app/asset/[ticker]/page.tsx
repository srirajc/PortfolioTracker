'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface Transaction {
  id: number;
  transaction_type: 'BUY' | 'SELL';
  quantity: number;
  price_per_unit: number;
  created_at: string;
}

interface AssetDetails {
  id: number;
  ticker: string;
  name: string;
  asset_type: string;
  currency: string;
  currentUnits: number;
  avgBuyPrice: number;
  currentPrice: number;
  transactions: Transaction[];
}

export default function AssetDetailPage({ params }: { params: Promise<{ ticker: string }> | { ticker: string } }) {
  // Safe param unwrapping across Next.js 15 client navigations
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const ticker = resolvedParams.ticker.toUpperCase();

  const [asset, setAsset] = useState<AssetDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [transType, setTransType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPrice, setCustomPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAssetData();
  }, [ticker]);

  const fetchAssetData = async () => {
    try {
      const res = await fetch(`/api/asset/${ticker}`);
      if (!res.ok) throw new Error('Failed to fetch asset details');
      const data = await res.json();
      setAsset(data);
      if (data.currentPrice) {
        setCustomPrice(data.currentPrice.toString());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset || !quantity) return;

    setSubmitting(true);
    const executionPrice = useCustomPrice ? parseFloat(customPrice) : asset.currentPrice;

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_id: asset.id,
          transaction_type: transType,
          quantity: parseFloat(quantity),
          price_per_unit: executionPrice,
        }),
      });

      if (!res.ok) throw new Error('Transaction failed');

      setQuantity('');
      await fetchAssetData();
    } catch (err) {
      console.error(err);
      alert('Error recording transaction');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-white min-h-screen bg-slate-900">Loading asset details...</div>;
  if (!asset) return (
    <div className="p-8 text-red-400 min-h-screen bg-slate-900">
      Asset non-existent or not found.{' '}
      <Link href="/" className="underline text-indigo-400">Return home</Link>
    </div>
  );

  const effectivePrice = useCustomPrice ? (parseFloat(customPrice) || 0) : asset.currentPrice;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 space-y-8">
      {/* Top Bar */}
      <div className="flex justify-between items-center">
        <div>
          <Link href="/" className="text-sm text-indigo-400 hover:underline">← Back to Dashboard</Link>
          <h1 className="text-3xl font-bold mt-1">{asset.name} <span className="text-slate-400">({asset.ticker})</span></h1>
          <p className="text-xs text-slate-400 uppercase tracking-wide">{asset.asset_type} • {asset.currency}</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-slate-400 text-xs">Units Held</p>
          <p className="text-2xl font-bold">{asset.currentUnits}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-slate-400 text-xs">Avg Buy Price</p>
          <p className="text-2xl font-bold">${asset.avgBuyPrice.toFixed(2)} {asset.currency}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-slate-400 text-xs">Market Price</p>
          <p className="text-2xl font-bold">${asset.currentPrice.toFixed(2)} {asset.currency}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-slate-400 text-xs">Total Holding Value</p>
          <p className="text-2xl font-bold">${(asset.currentUnits * asset.currentPrice).toFixed(2)} {asset.currency}</p>
        </div>
      </div>

      {/* Buy / Sell Form */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Execute Buy / Sell</h2>
        <form onSubmit={handleTransactionSubmit} className="space-y-4">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setTransType('BUY')}
              className={`flex-1 py-2 rounded-lg font-semibold border transition ${
                transType === 'BUY' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'
              }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setTransType('SELL')}
              className={`flex-1 py-2 rounded-lg font-semibold border transition ${
                transType === 'SELL' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'
              }`}
            >
              Sell
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Number of Units</label>
            <input
              type="number"
              step="any"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 10"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400">Price Configuration</label>
              <label className="flex items-center text-xs text-indigo-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomPrice}
                  onChange={(e) => setUseCustomPrice(e.target.checked)}
                  className="mr-2"
                />
                Specify Custom Execution Price
              </label>
            </div>

            {useCustomPrice ? (
              <input
                type="number"
                step="any"
                required
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Execution price per unit"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            ) : (
              <p className="text-sm text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-700">
                Executing at Market Price: <span className="font-semibold text-white">${asset.currentPrice.toFixed(2)} {asset.currency}</span>
              </p>
            )}
          </div>

          <div className="pt-2">
            <p className="text-xs text-slate-400 mb-3">
              Estimated Total: <span className="text-white font-bold">${((parseFloat(quantity) || 0) * effectivePrice).toFixed(2)} {asset.currency}</span>
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition"
            >
              {submitting ? 'Processing...' : `Confirm ${transType}`}
            </button>
          </div>
        </form>
      </div>

      {/* Transaction History Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-bold">Transaction History</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase">
            <tr>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Quantity</th>
              <th className="px-6 py-3">Price / Unit</th>
              <th className="px-6 py-3">Total Cost</th>
              <th className="px-6 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {asset.transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-700/30">
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                    tx.transaction_type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {tx.transaction_type}
                  </span>
                </td>
                <td className="px-6 py-3">{tx.quantity}</td>
                <td className="px-6 py-3">${Number(tx.price_per_unit).toFixed(2)}</td>
                <td className="px-6 py-3">${(tx.quantity * tx.price_per_unit).toFixed(2)}</td>
                <td className="px-6 py-3 text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
