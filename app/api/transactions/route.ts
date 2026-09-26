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
    const { asset_id, transaction_type, quantity, price_per_unit } = await request.json();

    if (!asset_id || !transaction_type || !quantity || !price_per_unit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO transactions (asset_id, transaction_type, quantity, price_per_unit, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `;

    const res = await pool.query(insertQuery, [asset_id, transaction_type, quantity, price_per_unit]);

    return NextResponse.json(res.rows[0]);
  } catch (error) {
    console.error('Error recording transaction:', error);
    return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 });
  }
}
