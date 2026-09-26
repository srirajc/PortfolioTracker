import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const revalidate = 0;

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'sriraj',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'portfolio_db',
  password: process.env.POSTGRES_PASSWORD || '',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
});

const CRYPTO_COINGECKO_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  RENDER: 'render-token',
  AAVE: 'aave',
  ONDO: 'ondo-finance',
  SOL: 'solana',
  ADA: 'cardano',
  XRP: 'ripple',
  DOGE: 'dogecoin',
};

// Tier 1 Crypto Fetch: CoinGecko
async function fetchCryptoCoinGecko(ticker: string): Promise<number | null> {
  const clean = ticker.trim().toUpperCase();
  const coinId = CRYPTO_COINGECKO_MAP[clean] || clean.toLowerCase();
  
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[coinId]?.usd ?? null;
  } catch {
    return null;
  }
}

// Tier 2 Crypto Fetch: Binance Public API
async function fetchCryptoBinance(ticker: string): Promise<number | null> {
  const clean = ticker.trim().toUpperCase();
  const symbol = `${clean}USDT`;
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const price = parseFloat(data?.price);
    return isNaN(price) || price === 0 ? null : price;
  } catch {
    return null;
  }
}

// Tier 3 Crypto Fetch: CoinCap API
async function fetchCryptoCoinCap(ticker: string): Promise<number | null> {
  const clean = ticker.trim().toUpperCase();
  const coinId = CRYPTO_COINGECKO_MAP[clean] || clean.toLowerCase();
  try {
    const res = await fetch(`https://api.coincap.io/v2/assets/${coinId}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const price = parseFloat(data?.data?.priceUsd);
    return isNaN(price) || price === 0 ? null : price;
  } catch {
    return null;
  }
}

// Robust Crypto Resolver
async function resolveCryptoPrice(ticker: string): Promise<number | null> {
  // Try CoinGecko
  const cgPrice = await fetchCryptoCoinGecko(ticker);
  if (cgPrice !== null) {
    console.log(`[PORTFOLIO API] Crypto (CoinGecko) for ${ticker}: $${cgPrice} USD`);
    return cgPrice;
  }

  // Try Binance
  const binancePrice = await fetchCryptoBinance(ticker);
  if (binancePrice !== null) {
    console.log(`[PORTFOLIO API] Crypto (Binance) for ${ticker}: $${binancePrice} USD`);
    return binancePrice;
  }

  // Try CoinCap
  const coincapPrice = await fetchCryptoCoinCap(ticker);
  if (coincapPrice !== null) {
    console.log(`[PORTFOLIO API] Crypto (CoinCap) for ${ticker}: $${coincapPrice} USD`);
    return coincapPrice;
  }

  return null;
}

// Stooq Fetcher for Stocks and US_STOCKS
async function fetchStockPriceStooq(ticker: string, currency: string, assetType: string): Promise<number | null> {
  const clean = ticker.trim().toUpperCase();
  const typeUpper = assetType.trim().toUpperCase();
  let stooqSymbol = clean.toLowerCase();

  if (typeUpper === 'US_STOCKS' || currency.toUpperCase() === 'USD') {
    if (!stooqSymbol.endsWith('.us')) stooqSymbol = `${stooqSymbol}.us`;
  } else if (currency.toUpperCase() === 'AUD') {
    if (!stooqSymbol.endsWith('.au')) stooqSymbol = `${stooqSymbol}.au`;
  }

  try {
    const url = `https://stooq.com/q/l/?s=${stooqSymbol}&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;

    const dataRow = lines[1].split(',');
    const closePriceStr = dataRow[6];
    const price = parseFloat(closePriceStr);
    return isNaN(price) || price === 0 ? null : price;
  } catch {
    return null;
  }
}

// Yahoo Direct Chart API Fallback
async function fetchYahooPriceFallback(ticker: string, currency: string, assetType: string): Promise<number | null> {
  const clean = ticker.trim().toUpperCase();
  const typeUpper = assetType.trim().toUpperCase();
  let symbol = clean;

  if (typeUpper !== 'US_STOCKS' && currency.toUpperCase() === 'AUD' && !symbol.endsWith('.AX')) {
    symbol = `${symbol}.AX`;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

async function getLivePrice(ticker: string, currency: string, assetType: string): Promise<number | null> {
  const clean = ticker.trim().toUpperCase();
  const typeUpper = assetType.trim().toUpperCase();

  // Explicit check for CRYPTO asset type
  if (typeUpper === 'CRYPTO' || clean in CRYPTO_COINGECKO_MAP) {
    const cryptoPrice = await resolveCryptoPrice(clean);
    if (cryptoPrice !== null) return cryptoPrice;
  }

  // Stocks & US_STOCKS via Stooq
  const stooqPrice = await fetchStockPriceStooq(clean, currency, typeUpper);
  if (stooqPrice !== null) {
    console.log(`[PORTFOLIO API] Stooq price for ${clean} (${typeUpper}): $${stooqPrice}`);
    return stooqPrice;
  }

  // Fallback to Yahoo
  const yahooPrice = await fetchYahooPriceFallback(clean, currency, typeUpper);
  if (yahooPrice !== null) {
    console.log(`[PORTFOLIO API] Yahoo fallback price for ${clean} (${typeUpper}): $${yahooPrice}`);
    return yahooPrice;
  }

  console.warn(`[PORTFOLIO API] Could not retrieve market price for ${clean}`);
  return null;
}

export async function GET() {
  try {
    const query = `
      SELECT 
        a.id,
        a.name,
        a.ticker,
        a.asset_type AS asset_type,
        a.currency,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END), 0) AS units,
        COALESCE(
          SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity * t.price_per_unit ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE 0 END), 0), 
          0
        ) AS avg_buy_price
      FROM assets a
      LEFT JOIN transactions t ON a.id = t.asset_id
      GROUP BY a.id, a.name, a.ticker, a.asset_type, a.currency;
    `;

    const { rows } = await pool.query(query);

    let usdToAud = 1.48;
    try {
      const fxPrice = await fetchStockPriceStooq('AUDUSD', 'USD', 'US_STOCKS');
      if (fxPrice && fxPrice > 0) {
        usdToAud = 1 / fxPrice;
      }
    } catch {
      console.warn('[PORTFOLIO API] AUDUSD FX fetch failed, using default 1.48');
    }

    let totalValueAUDNum = 0;
    let totalCostAUDNum = 0;
    let sharesValueAUDNum = 0;
    let etfsValueAUDNum = 0;
    let cryptoValueAUDNum = 0;

    const holdings = await Promise.all(
      rows.map(async (row) => {
        const quantityNum = Number(row.units) || 0;
        const avgCostNum = Number(row.avg_buy_price) || 0;
        const currencyStr = row.currency || 'AUD';
        const tickerStr = row.ticker || '';
        const assetTypeStr = row.asset_type || 'STOCKS';
        const typeUpper = assetTypeStr.trim().toUpperCase();

        let currentPriceNum = avgCostNum;

        if (tickerStr) {
          const livePrice = await getLivePrice(tickerStr, currencyStr, assetTypeStr);
          if (livePrice !== null) {
            currentPriceNum = livePrice;
          }
        }

        const isCrypto = typeUpper === 'CRYPTO';
        const isUSStock = typeUpper === 'US_STOCKS';
        const rate = (isCrypto || isUSStock || currencyStr.toUpperCase() === 'USD') ? usdToAud : 1;

        const costBasisNum = quantityNum * avgCostNum;
        const currentValueNum = quantityNum * currentPriceNum;
        const currentValueAUDNum = currentValueNum * rate;
        const costBasisAUDNum = costBasisNum * rate;
        const unrealisedGainAUDNum = currentValueAUDNum - costBasisAUDNum;
        const gainPercentNum = costBasisAUDNum > 0 ? (unrealisedGainAUDNum / costBasisAUDNum) * 100 : 0;

        totalValueAUDNum += currentValueAUDNum;
        totalCostAUDNum += costBasisAUDNum;

        const tickerUpper = String(tickerStr).toUpperCase();
        const nameUpper = String(row.name || '').toUpperCase();

        const isETF = 
          typeUpper.includes('ETF') || 
          typeUpper.includes('INDEX') || 
          tickerUpper.includes('ETF') ||
          ['VAS', 'VGS', 'IVV', 'NDQ', 'A200', 'DHHF', 'VDHG', 'QUAL', 'IOZ', 'STW', 'VHY', 'VDBA', 'VDAL', 'NDIA', 'CRYP'].some(t => tickerUpper.includes(t)) ||
          nameUpper.includes('VANGUARD') ||
          nameUpper.includes('ISHARES') ||
          nameUpper.includes('BETASHARES');

        if (isCrypto) {
          cryptoValueAUDNum += currentValueAUDNum;
        } else if (isETF) {
          etfsValueAUDNum += currentValueAUDNum;
        } else {
          sharesValueAUDNum += currentValueAUDNum;
        }

        return {
          id: row.id,
          ticker: tickerStr,
          name: row.name || '',
          assetType: assetTypeStr,
          currency: currencyStr,
          quantity: quantityNum,
          avgCost: avgCostNum.toFixed(2),
          costBasis: costBasisNum.toFixed(2),
          currentPrice: currentPriceNum.toFixed(2),
          currentValue: currentValueNum.toFixed(2),
          currentValueAUD: currentValueAUDNum.toFixed(2),
          unrealisedGainAUD: unrealisedGainAUDNum.toFixed(2),
          gainPercent: gainPercentNum.toFixed(2),
        };
      })
    );

    const totalGainAUDNum = totalValueAUDNum - totalCostAUDNum;
    const totalGainPercentNum = totalCostAUDNum > 0 ? (totalGainAUDNum / totalCostAUDNum) * 100 : 0;

    const summary = {
      totalValueAUD: totalValueAUDNum.toFixed(2),
      totalCostAUD: totalCostAUDNum.toFixed(2),
      totalGainAUD: totalGainAUDNum.toFixed(2),
      totalGainPercent: totalGainPercentNum.toFixed(2),
      sharesValueAUD: sharesValueAUDNum.toFixed(2),
      etfsValueAUD: etfsValueAUDNum.toFixed(2),
      cryptoValueAUD: cryptoValueAUDNum.toFixed(2),
      usdToAudRate: usdToAud.toFixed(2),
    };

    return NextResponse.json({ summary, holdings });
  } catch (error) {
    console.error('[PORTFOLIO API] Error in GET handler:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio data' }, { status: 500 });
  }
}
