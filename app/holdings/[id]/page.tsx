import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAssetDetailById } from '../../../lib/services/marketData';

interface Props {
  params: { id: string };
}

export default async function HoldingDetailPage({ params }: Props) {
  const asset = await getAssetDetailById(params.id);

  if (!asset) {
    notFound();
  }

  const { symbol, name, type, metrics, holding, description } = asset;
  const isPositive = metrics.priceChange24h >= 0;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors flex items-center gap-1"
        >
          ← Back to Portfolio
        </Link>
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase">
          {type}
        </span>
      </div>

      {/* Primary Asset Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">{name}</h1>
            <p className="text-sm font-mono text-slate-400 mt-1">{symbol}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-100">
              ${metrics.currentPrice.toLocaleString('en-AU', { minimumFractionDigits: 2 })} {metrics.currency}
            </div>
            <div className={`text-sm font-medium mt-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? '+' : ''}{metrics.priceChange24h}% (24h)
            </div>
          </div>
        </div>
      </div>

      {/* Position Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Units Held</p>
          <p className="text-2xl font-bold text-slate-100 mt-2">
            {holding.unitsHeld.toLocaleString('en-AU', { maximumFractionDigits: 6 })}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Average Buy Price</p>
          <p className="text-2xl font-bold text-slate-100 mt-2">
            ${holding.avgBuyPrice.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Position Value</p>
          <p className="text-2xl font-bold text-slate-100 mt-2">
            ${(holding.unitsHeld * metrics.currentPrice).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Description / Information */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-3">Asset Information</h2>
        <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
