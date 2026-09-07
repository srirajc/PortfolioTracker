import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  user: 'sriraj',
  host: 'localhost',
  database: 'portfolio_db',
  port: 5432,
});

interface Trade {
  id: number;
  transaction_type: 'BUY' | 'SELL';
  quantity: number;
  price_per_unit: number;
  brokerage: number;
  transaction_date: string;
}

interface BuyParcel {
  date: Date;
  quantity: number;
  costPerUnit: number; // Price + proportional brokerage
}

export async function GET() {
  try {
    const assetsRes = await pool.query('SELECT * FROM assets');
    const assets = assetsRes.rows;

    let totalGrossGain = 0;
    let totalDiscountedGain = 0;
    const cgtEvents: any[] = [];

    for (const asset of assets) {
      const tradesRes = await pool.query(
        'SELECT * FROM transactions WHERE asset_id = $1 ORDER BY transaction_date ASC, id ASC',
        [asset.id]
      );
      const trades: Trade[] = tradesRes.rows;

      const buyParcels: BuyParcel[] = [];

      for (const trade of trades) {
        const tradeDate = new Date(trade.transaction_date);
        const qty = Number(trade.quantity);
        const price = Number(trade.price_per_unit);
        const brokerage = Number(trade.brokerage || 0);

        if (trade.transaction_type === 'BUY') {
          const totalCost = (qty * price) + brokerage;
          buyParcels.push({
            date: tradeDate,
            quantity: qty,
            costPerUnit: totalCost / qty,
          });
        } else if (trade.transaction_type === 'SELL') {
          let remainingSellQty = qty;
          const netProceeds = (qty * price) - brokerage;
          const proceedPerUnit = netProceeds / qty;

          while (remainingSellQty > 0 && buyParcels.length > 0) {
            const oldestBuy = buyParcels[0];
            const matchedQty = Math.min(remainingSellQty, oldestBuy.quantity);

            const costBase = matchedQty * oldestBuy.costPerUnit;
            const grossProceeds = matchedQty * proceedPerUnit;
            const gain = grossProceeds - costBase;

            // Check 12-month holding rule for ATO 50% CGT Discount
            const daysHeld = (tradeDate.getTime() - oldestBuy.date.getTime()) / (1000 * 3600 * 24);
            const isDiscountEligible = daysHeld >= 365 && gain > 0;
            const taxableGain = isDiscountEligible ? gain * 0.5 : gain;

            totalGrossGain += gain;
            totalDiscountedGain += taxableGain;

            cgtEvents.push({
              ticker: asset.ticker,
              buyDate: oldestBuy.date.toISOString().split('T')[0],
              sellDate: tradeDate.toISOString().split('T')[0],
              quantity: matchedQty,
              costBase: costBase.toFixed(2),
              proceeds: grossProceeds.toFixed(2),
              grossGain: gain.toFixed(2),
              taxableGain: taxableGain.toFixed(2),
              isDiscountEligible,
            });

            oldestBuy.quantity -= matchedQty;
            remainingSellQty -= matchedQty;

            if (oldestBuy.quantity <= 0) {
              buyParcels.shift();
            }
          }
        }
      }
    }

    return NextResponse.json({
      summary: {
        totalGrossGain: totalGrossGain.toFixed(2),
        totalDiscountedGain: totalDiscountedGain.toFixed(2),
        cgtDiscountSavings: (totalGrossGain - totalDiscountedGain).toFixed(2),
      },
      events: cgtEvents,
    });
  } catch (error: any) {
    console.error('CGT Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
