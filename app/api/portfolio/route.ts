import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const revalidate = 30;

async function fetchLiveQuote(ticker: string, assetType: string) {
  try {
    const cleanTicker = ticker.toUpperCase().replace('.AX', '');
    if (assetType.includes('CRYPTO')) {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${cleanTicker}USDT`, { next: { revalidate: 30 } });
      if (res.ok) {
        const data = await res.json();
        return parseFloat(data.price) * 1.48; // USD -> AUD conversion
      }
    } else {
      const yahooSymbol = cleanTicker.includes('.') || cleanTicker.length > 4 ? cleanTicker : `${cleanTicker}.AX`;
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 30 },
      });
      if (res.ok) {
        const json = await res.json();
        const price = json.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price) return price;
      }
    }
  } catch (err) {
    console.error(`Quote error for ${ticker}:`, err);
  }
  return null;
}

export async function GET() {
  try {
    let rows: any[] = [];
    
    try {
      const result = await pool.query(`
        SELECT 
          a.id, 
          a.ticker, 
          a.name, 
          a.asset_type, 
          a.currency,
          COALESCE(SUM(
            CASE 
              WHEN LOWER(t.transaction_type) = 'buy' THEN t.quantity 
              WHEN LOWER(t.transaction_type) = 'sell' THEN -t.quantity 
              ELSE 0 
            END
          ), 0) AS quantity,
          COALESCE(AVG(t.price_per_unit), 0) AS avg_cost
        FROM assets a
        LEFT JOIN transactions t ON a.id = t.asset_id
        GROUP BY a.id, a.ticker, a.name, a.asset_type, a.currency
        ORDER BY a.id ASC
      `);
      rows = result.rows;
    } catch (dbErr) {
      console.warn('Transaction join failed, falling back to direct assets query:', dbErr);
      const fallback = await pool.query(`SELECT * FROM assets ORDER BY id ASC`);
      rows = fallback.rows;
    }

    // Parallel live market price lookups
    const quotePromises = rows.map((r: any) => 
      fetchLiveQuote(r.ticker || r.symbol || '', String(r.asset_type || r.assetType || 'STOCKS').toUpperCase())
    );
    const quoteResults = await Promise.allSettled(quotePromises);

    let totalValueNum = 0;
    let totalCostNum = 0;
    let sharesValNum = 0;
    let etfsValNum = 0;
    let cryptoValNum = 0;

    const holdings = rows.map((item: any, idx: number) => {
      const qty = parseFloat(item.quantity ?? item.units ?? item.shares ?? 0);
      const avgCostNum = parseFloat(item.avg_cost ?? item.avgCost ?? item.price_per_unit ?? item.price ?? 0);
      const cleanTicker = (item.ticker || item.symbol || '').toUpperCase().replace('.AX', '');
      const typeUpper = String(item.asset_type || item.assetType || 'STOCKS').toUpperCase();

      const liveQuoteRes = quoteResults[idx];
      const liveMarketPrice = liveQuoteRes.status === 'fulfilled' && liveQuoteRes.value ? liveQuoteRes.value : null;

      // Fallback hierarchy: Live market price -> Avg cost -> Default $10.00
      const currentPriceNum = liveMarketPrice ?? (avgCostNum > 0 ? avgCostNum : 10.00);

      const currentValueNum = qty * currentPriceNum;
      const costBasisNum = qty * avgCostNum;
      const gainNum = currentValueNum - costBasisNum;
      const gainPctNum = costBasisNum > 0 ? (gainNum / costBasisNum) * 100 : 0;

      totalValueNum += currentValueNum;
      totalCostNum += costBasisNum;

      if (typeUpper.includes('CRYPTO')) {
        cryptoValNum += currentValueNum;
      } else if (typeUpper.includes('ETF')) {
        etfsValNum += currentValueNum;
      } else {
        sharesValNum += currentValueNum;
      }

      return {
        id: item.id,
        ticker: cleanTicker,
        symbol: cleanTicker,
        name: item.name || cleanTicker,
        assetType: typeUpper,
        currency: item.currency || 'AUD',
        quantity: qty,
        units: qty,
        shares: qty,
        avgCost: avgCostNum.toFixed(2),
        costBasis: costBasisNum.toFixed(2),
        currentPrice: currentPriceNum.toFixed(2),
        currentValue: currentValueNum.toFixed(2),
        currentValueAUD: currentValueNum.toFixed(2),
        unrealisedGainAUD: gainNum.toFixed(2),
        gainPercent: gainPctNum.toFixed(2),
      };
    });

    const totalGainNum = totalValueNum - totalCostNum;
    const totalGainPctNum = totalCostNum > 0 ? (totalGainNum / totalCostNum) * 100 : 0;

    const summary = {
      totalValueAUD: totalValueNum.toFixed(2),
      totalCostAUD: totalCostNum.toFixed(2),
      totalGainAUD: totalGainNum.toFixed(2),
      totalGainPercent: totalGainPctNum.toFixed(2),
      sharesValueAUD: sharesValNum.toFixed(2),
      etfsValueAUD: etfsValNum.toFixed(2),
      cryptoValueAUD: cryptoValNum.toFixed(2),
      usdToAudRate: '1.48',
    };

    return NextResponse.json({ summary, holdings, data: holdings }, { status: 200 });
  } catch (error: any) {
    console.error('[PORTFOLIO API ERROR]', error);
    return NextResponse.json({ error: error.message, summary: null, holdings: [] }, { status: 500 });
  }
}
