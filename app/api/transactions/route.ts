import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticker, name, asset_type, transaction_type, quantity, price_per_unit, brokerage, transaction_date, notes } = body;

    // 1. Check or insert asset
    let assetRes = await pool.query('SELECT id FROM assets WHERE ticker = $1', [ticker.toUpperCase()]);
    let assetId;

    if (assetRes.rows.length === 0) {
      const newAsset = await pool.query(
        'INSERT INTO assets (ticker, name, asset_type) VALUES ($1, $2, $3) RETURNING id',
        [ticker.toUpperCase(), name || ticker, asset_type || 'ASX_SHARE']
      );
      assetId = newAsset.rows[0].id;
    } else {
      assetId = assetRes.rows[0].id;
    }

    // 2. Insert transaction
    await pool.query(
      `INSERT INTO transactions (asset_id, transaction_type, quantity, price_per_unit, brokerage, transaction_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        assetId,
        transaction_type,
        parseFloat(quantity),
        parseFloat(price_per_unit),
        parseFloat(brokerage || 0),
        transaction_date || new Date().toISOString().split('T')[0],
        notes || '',
      ]
    );

    return NextResponse.json({ success: true, message: 'Transaction recorded successfully!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
