import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { parse } from 'csv-parse/sync';

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'sriraj',
  host: 'localhost',
  database: 'portfolio_db',
  port: 5432,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No CSV file uploaded' }, { status: 400 });
    }

    const csvText = await file.text();
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    let importCount = 0;

    for (const record of records) {
      const rowKeys = Object.keys(record);
      const getVal = (possibleKeys: string[]) => {
        const match = rowKeys.find((k) =>
          possibleKeys.includes(k.toLowerCase().trim().replace(/[^a-z0-9]/g, ''))
        );
        return match ? record[match] : null;
      };

      let rawMarket = (getVal(['code', 'symbol', 'ticker', 'market', 'asset', 'security', 'stock']) || '').trim().toUpperCase();
      let ticker = rawMarket.split('/')[0].replace(/\.AX$/i, '').trim();

      if (!ticker || ticker.length > 10 || ticker.includes('CASH') || ticker.includes('INTEREST') || ticker.includes('FEE')) {
        continue;
      }

      const qtyStr = getVal(['amount', 'units', 'quantity', 'qty', 'shares', 'currentunits', 'holding', 'executedunits']);
      const priceStr = getVal(['rate', 'price', 'unitprice', 'priceperunit', 'purchaseprice', 'avgprice', 'averageprice', 'costprice']);
      
      const quantity = Math.abs(parseFloat((qtyStr || '0').replace(/[^0-9.-]/g, '')));
      let price = Math.abs(parseFloat((priceStr || '0').replace(/[^0-9.-]/g, '')));

      if (isNaN(quantity) || quantity <= 0) continue;

      let assetRes = await pool.query('SELECT id FROM assets WHERE ticker = $1', [ticker]);
      let assetId;

      if (assetRes.rows.length === 0) {
        const newAsset = await pool.query(
          'INSERT INTO assets (ticker, name, asset_type) VALUES ($1, $2, $3) RETURNING id',
          [ticker, ticker, 'STOCKS']
        );
        assetId = newAsset.rows[0].id;
      } else {
        assetId = assetRes.rows[0].id;
      }

      // Check if transactions exist
      const existingTx = await pool.query('SELECT price_per_unit FROM transactions WHERE asset_id = $1 LIMIT 1', [assetId]);

      if (existingTx.rows.length > 0) {
        // If price from CSV is zero/invalid, keep existing stored cost price
        if (isNaN(price) || price <= 1) {
          price = Number(existingTx.rows[0].price_per_unit);
        }
        // Update transaction quantity/price
        await pool.query(
          'UPDATE transactions SET quantity = $1, price_per_unit = $2 WHERE asset_id = $3',
          [quantity, price, assetId]
        );
      } else {
        // Insert new stock
        await pool.query(
          `INSERT INTO transactions (asset_id, transaction_type, quantity, price_per_unit, brokerage, transaction_date)
           VALUES ($1, 'BUY', $2, $3, 0, NOW())`,
          [assetId, quantity, price || 1]
        );
      }

      importCount++;
    }

    return NextResponse.json({
      message: `Successfully synced ${importCount} holdings while preserving cost bases!`,
    });
  } catch (error: any) {
    console.error('CSV Import Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
