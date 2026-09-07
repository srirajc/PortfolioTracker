import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const revalidate = 3600;

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'sriraj',
  host: 'localhost',
  database: 'portfolio_db',
  port: 5432,
});

const US_TICKERS = new Set(['NVDA', 'TSLA', 'SPCX', 'AMAT', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META']);
const ETF_TICKERS = new Set(['VDHG', 'FANG', 'NDIA', 'SPCX', 'CRYP', 'STW', 'VAS', 'VGS', 'IVV']);

async function fetchStooqPrice(symbol: string): Promise<{ price: number; currency: string } | null> {
  try {
    let stooqSymbol = symbol.toLowerCase();
    if (symbol.endsWith('.AX')) {
      stooqSymbol = `${symbol.replace('.AX', '')}.au`;
    } else if (US_TICKERS.has(symbol)) {
      stooqSymbol = `${symbol}.us`;
    } else if (symbol === 'USDAUD=X') {
      stooqSymbol = 'usdaud';
    }

    const url = `https://stooq.com/q/l/?s=${stooqSymbol}&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const csvText = await res.text();
    const lines = csvText.split('\n');

    if (lines.length > 1) {
      const columns = lines[1].split(',');
      const closePrice = parseFloat(columns[4]);
      if (!isNaN(closePrice) && closePrice > 0) {
        return {
          price: closePrice,
          currency: US_TICKERS.has(symbol) ? 'USD' : 'AUD',
        };
      }
    }
  } catch (err) {
    // Failover
  }
  return null;
}

async function fetchYahooPrice(symbol: string): Promise<{ price: number; currency: string } | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice;
      if (typeof price === 'number' && price > 0) {
        return {
          price,
          currency: (meta?.currency || (symbol.endsWith('.AX') ? 'AUD' : 'USD')).toUpperCase(),
        };
      }
    }
  } catch (err) {
    // Failover
  }
  return null;
}

async function getLivePrice(symbol: string): Promise<{ price: number; currency: string } | null> {
  let quote = await fetchStooqPrice(symbol);
  if (quote) return quote;

  quote = await fetchYahooPrice(symbol);
  if (quote) return quote;

  return null;
}

export async function GET() {
  try {
    const query = `
      SELECT 
        a.id,
        a.ticker,
        a.name,
        a.asset_type,
        SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END)::numeric as total_quantity,
        SUM(CASE WHEN t.transaction_type = 'BUY' 
                 THEN (t.quantity * t.price_per_unit) + COALESCE(t.brokerage, 0)
                 ELSE -((t.quantity * t.price_per_unit) - COALESCE(t.brokerage, 0)) END)::numeric as net_invested
      FROM assets a
      JOIN transactions t ON a.id = t.asset_id
      GROUP BY a.id, a.ticker, a.name, a.asset_type
      HAVING SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END) > 0.0001
      ORDER BY a.ticker ASC
    `;

    const res = await pool.query(query);
    const holdings = res.rows;

    let usdToAudRate = 1.52;
    const fxQuote = await getLivePrice('USDAUD=X');
    if (fxQuote && fxQuote.price) {
      usdToAudRate = fxQuote.price;
    }

    let portfolioTotalValueAUD = 0;
    let portfolioTotalCostAUD = 0;

    let sharesTotalValueAUD = 0;
    let etfsTotalValueAUD = 0;
    let cryptoTotalValueAUD = 0;

    const enrichedHoldings = await Promise.all(
      holdings.map(async (h) => {
        const qty = Number(h.total_quantity || 0);
        const costBasisOriginal = Number(h.net_invested || 0);
        const avgCostOriginal = qty > 0 ? costBasisOriginal / qty : 0;

        let rawTicker = h.ticker.trim().toUpperCase();
        let querySymbol = rawTicker;

        const isUS = US_TICKERS.has(rawTicker) || h.asset_type === 'US_STOCKS';
        const isCrypto = h.asset_type === 'CRYPTO';

        if (isCrypto) {
          querySymbol = rawTicker.endsWith('-AUD') ? rawTicker : `${rawTicker}-AUD`;
        } else if (!isUS && !rawTicker.includes('.')) {
          querySymbol = `${rawTicker}.AX`;
        }

        let liveQuote = await getLivePrice(querySymbol);

        let currentPriceNative = avgCostOriginal;
        let currency = isUS ? 'USD' : 'AUD';

        if (liveQuote && liveQuote.price) {
          currentPriceNative = liveQuote.price;
          currency = liveQuote.currency;
        }

        const currentValueNative = qty * currentPriceNative;
        const fxMultiplier = currency === 'USD' ? usdToAudRate : 1.0;

        const currentValueAUD = currentValueNative * fxMultiplier;
        const costBasisAUD = costBasisOriginal;

        const unrealisedGainAUD = currentValueAUD - costBasisAUD;
        const gainPercent = costBasisAUD > 0 ? (unrealisedGainAUD / costBasisAUD) * 100 : 0;

        portfolioTotalValueAUD += currentValueAUD;
        portfolioTotalCostAUD += costBasisAUD;

        // Categorize into Shares, ETFs, or Crypto
        if (isCrypto) {
          cryptoTotalValueAUD += currentValueAUD;
        } else if (ETF_TICKERS.has(rawTicker) || h.asset_type === 'ETF') {
          etfsTotalValueAUD += currentValueAUD;
        } else {
          sharesTotalValueAUD += currentValueAUD;
        }

        return {
          id: h.id,
          ticker: rawTicker,
          name: h.name,
          assetType: h.asset_type,
          currency,
          quantity: qty,
          avgCost: avgCostOriginal.toFixed(2),
          costBasis: costBasisOriginal.toFixed(2),
          currentPrice: currentPriceNative.toFixed(2),
          currentValue: currentValueNative.toFixed(2),
          currentValueAUD: currentValueAUD.toFixed(2),
          unrealisedGainAUD: unrealisedGainAUD.toFixed(2),
          gainPercent: gainPercent.toFixed(2),
        };
      })
    );

    const totalGainAUD = portfolioTotalValueAUD - portfolioTotalCostAUD;
    const totalGainPercent = portfolioTotalCostAUD > 0 ? (totalGainAUD / portfolioTotalCostAUD) * 100 : 0;

    return NextResponse.json(
      {
        summary: {
          totalValueAUD: portfolioTotalValueAUD.toFixed(2),
          totalCostAUD: portfolioTotalCostAUD.toFixed(2),
          totalGainAUD: totalGainAUD.toFixed(2),
          totalGainPercent: totalGainPercent.toFixed(2),
          sharesValueAUD: sharesTotalValueAUD.toFixed(2),
          etfsValueAUD: etfsTotalValueAUD.toFixed(2),
          cryptoValueAUD: cryptoTotalValueAUD.toFixed(2),
          usdToAudRate: usdToAudRate.toFixed(4),
        },
        holdings: enrichedHoldings,
      },
      {
        headers: {
          'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error: any) {
    console.error('Portfolio Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
