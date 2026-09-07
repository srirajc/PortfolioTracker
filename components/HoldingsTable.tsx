'use client';

import React, { useState } from 'react';

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

export default function HoldingsTable({
  holdings,
  onRefresh,
}: {
  holdings: Holding[];
  onRefresh: () => void;
}) {
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<string>('');
  const [editCost, setEditCost] = useState<string>('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('STOCKS');
  const [newQty, setNewQty] = useState('');
  const [newCost, setNewCost] = useState('');

  const [saving, setSaving] = useState(false);

  const startEditing = (h: Holding) => {
    setEditingTicker(h.ticker);
    setEditQty(h.quantity.toString());
    setEditCost(h.avgCost);
  };

  const saveEditing = async (ticker: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/holdings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          quantity: parseFloat(editQty),
          avgCost: parseFloat(editCost),
        }),
      });

      if (!res.ok) throw new Error('Failed to update holding');
      setEditingTicker(null);
      onRefresh();
    } catch (err: any) {
      alert(`Error updating ${ticker}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/holdings/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: newTicker,
          name: newName,
          assetType: newType,
          quantity: parseFloat(newQty),
          avgCost: parseFloat(newCost),
        }),
      });

      if (!res.ok) throw new Error('Failed to add asset');
      setShowAddModal(false);
      setNewTicker('');
      setNewName('');
      setNewQty('');
      setNewCost('');
      onRefresh();
    } catch (err: any) {
      alert(`Error adding asset: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white">📊 Portfolio Holdings</h2>
          <p className="text-xs text-slate-400">US stocks native pricing auto-converts to AUD for total totals</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Add Asset (Vanguard / Crypto)
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3 text-right">Units</th>
              <th className="px-4 py-3 text-right">Avg Buy Price</th>
              <th className="px-4 py-3 text-right">Cost Basis</th>
              <th className="px-4 py-3 text-right">Live Price</th>
              <th className="px-4 py-3 text-right">Current Value (Native)</th>
              <th className="px-4 py-3 text-right">Unrealised P/L (AUD)</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {holdings.map((h) => {
              const isEditing = editingTicker === h.ticker;
              const isGain = parseFloat(h.unrealisedGainAUD) >= 0;
              const currSymbol = h.currency === 'USD' ? 'US$' : '$';

              return (
                <tr key={h.ticker} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-white">
                    {h.ticker}
                    <span className="inline-ml ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {h.currency}
                    </span>
                    <span className="block text-xs font-normal text-slate-400">{h.name}</span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        step="any"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                        className="w-24 bg-slate-950 border border-blue-500 rounded px-2 py-1 text-right text-white focus:outline-none"
                      />
                    ) : (
                      Number(h.quantity).toLocaleString()
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        step="any"
                        value={editCost}
                        onChange={(e) => setEditCost(e.target.value)}
                        className="w-24 bg-slate-950 border border-blue-500 rounded px-2 py-1 text-right text-white focus:outline-none"
                      />
                    ) : (
                      `${currSymbol}${h.avgCost}`
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">{currSymbol}{Number(h.costBasis).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-blue-400 font-semibold">{currSymbol}{h.currentPrice}</td>
                  <td className="px-4 py-3 text-right text-white font-bold">{currSymbol}{Number(h.currentValue).toLocaleString()}</td>

                  <td className={`px-4 py-3 text-right font-semibold ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isGain ? '+' : ''}A${Number(h.unrealisedGainAUD).toLocaleString()} ({h.gainPercent}%)
                  </td>

                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => saveEditing(h.ticker)}
                          disabled={saving}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2 py-1 rounded transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTicker(null)}
                          className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-2 py-1 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(h)}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-400 text-xs px-3 py-1 rounded transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Stock or Crypto Holding</h3>
            <form onSubmit={handleAddAsset} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Ticker / Symbol</label>
                <input
                  type="text"
                  placeholder="e.g. BTC, VGS, ETH"
                  required
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Asset Name</label>
                <input
                  type="text"
                  placeholder="e.g. Bitcoin, Vanguard International Shares"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Asset Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm"
                  >
                    <option value="STOCKS">ASX Stock / ETF</option>
                    <option value="US_STOCKS">US Stock</option>
                    <option value="CRYPTO">Crypto (CoinSpot)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Units Owned</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 0.05 or 120"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Average Purchase Price (Native Currency)</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 95000.00"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
                >
                  {saving ? 'Adding...' : 'Add Holding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
