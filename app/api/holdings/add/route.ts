import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'sriraj',
  host: 'localhost',
  database: 'portfolio_db',
  port: 5432,
});

export async function POST(req: Request) {
  try {
    const { ticker, name, assetType, quantity, avgCost } = await req.json();

    if (!ticker || quantity === undefined || avgCost === undefined) {
      return NextResponse.json({ error: 'Ticker, quantity, and cost basis are required' }, { status: 400 });
    }

    const cleanTicker = ticker.trim().toUpperCase();
    const type = (assetType || 'STOCKS').toUpperCase();

    let assetRes = await pool.query('SELECT id FROM assets WHERE ticker = $1', [cleanTicker]);
    let assetId;

    if (assetRes.rows.length === 0) {
      const newAsset = await pool.query(
        'INSERT INTO assets (ticker, name, asset_type) VALUES ($1, $2, $3) RETURNING id',
        [cleanTicker, name || cleanTicker, type]
      );
      assetId = newAsset.rows[0].id;
    } else {
      assetId = assetRes.rows[0].id;
    }

    // Insert or update transaction
    const txCheck = await pool.query('SELECT id FROM transactions WHERE asset_id = $1 LIMIT 1', [assetId]);

    if (txCheck.rows.length > 0) {
      await pool.query(
        'UPDATE transactions SET quantity = $1, price_per_unit = $2 WHERE asset_id = $3',
        [quantity, avgCost, assetId]
      );
    } else {
      await pool.query(
        `INSERT INTO transactions (asset_id, transaction_type, quantity, price_per_unit, brokerage, transaction_date)
         VALUES ($1, 'BUY', $2, $3, 0, NOW())`,
        [assetId, quantity, avgCost]
      );
    }

    return NextResponse.json({ message: `Successfully added ${cleanTicker}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
