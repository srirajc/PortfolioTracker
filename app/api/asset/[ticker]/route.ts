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

export async function GET(request: Request, { params }: { params: Promise<{ ticker: string }> }) {
  try {
    const { ticker } = await params;
    const tickerUpper = ticker.toUpperCase();

    const assetRes = await pool.query('SELECT * FROM assets WHERE UPPER(ticker) = $1', [tickerUpper]);
    if (assetRes.rows.length === 0) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const asset = assetRes.rows[0];

    const txRes = await pool.query(
      'SELECT * FROM transactions WHERE asset_id = $1 ORDER BY created_at DESC',
      [asset.id]
    );

    let currentUnits = 0;
    let buyCostTotal = 0;
    let buyUnitsTotal = 0;

    txRes.rows.forEach((tx) => {
      const q = Number(tx.quantity);
      const p = Number(tx.price_per_unit);
      if (tx.transaction_type === 'BUY') {
        currentUnits += q;
        buyCostTotal += q * p;
        buyUnitsTotal += q;
      } else {
        currentUnits -= q;
      }
    });

    const avgBuyPrice = buyUnitsTotal > 0 ? buyCostTotal / buyUnitsTotal : 0;
    const currentPrice = avgBuyPrice; // Replace with live price feed integration when ready

    return NextResponse.json({
      id: asset.id,
      ticker: asset.ticker,
      name: asset.name,
      asset_type: asset.asset_type,
      currency: asset.currency,
      currentUnits,
      avgBuyPrice,
      currentPrice,
      transactions: txRes.rows,
    });
  } catch (error) {
    console.error('Error fetching asset details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
