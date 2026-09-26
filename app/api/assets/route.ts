import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'sriraj',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'portfolio_db',
  password: process.env.POSTGRES_PASSWORD || '',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
});

export async function POST(request: Request) {
  try {
    const { ticker, name, asset_type, currency } = await request.json();

    if (!ticker || !name) {
      return NextResponse.json({ error: 'Ticker and Name are required' }, { status: 400 });
    }

    const tickerUpper = ticker.toUpperCase();

    // Check if asset already exists
    const existing = await pool.query('SELECT * FROM assets WHERE UPPER(ticker) = $1', [tickerUpper]);
    if (existing.rows.length > 0) {
      return NextResponse.json(existing.rows[0]);
    }

    // Insert new asset
    const insertRes = await pool.query(
      `INSERT INTO assets (ticker, name, asset_type, currency)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [tickerUpper, name, asset_type || 'STOCKS', currency || 'AUD']
    );

    return NextResponse.json(insertRes.rows[0]);
  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}
