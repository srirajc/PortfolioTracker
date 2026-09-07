import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  user: 'sriraj',
  host: 'localhost',
  database: 'portfolio_db',
  port: 5432,
});

async function getOrCreateAsset(ticker: string, name: string, assetType: string) {
  const res = await pool.query('SELECT id FROM assets WHERE ticker = $1', [ticker]);
  if (res.rows.length > 0) return res.rows[0].id;

  const newAsset = await pool.query(
    'INSERT INTO assets (ticker, name, asset_type) VALUES ($1, $2, $3) RETURNING id',
    [ticker, name, assetType]
  );
  return newAsset.rows[0].id;
}

export async function POST(req: Request) {
  try {
    const { rows } = await req.json();

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No data rows provided' }, { status: 400 });
    }

    let importedCount = 0;

    for (const row of rows) {
      // Clean key names (handles extra spaces around headers)
      const cleanedRow: Record<string, string> = {};
      Object.keys(row).forEach((k) => {
        cleanedRow[k.trim().toLowerCase()] = (row[k] || '').toString().trim();
      });

      const txDateRaw = cleanedRow['transactiondate'] || cleanedRow['date'] || cleanedRow['executed date'] || '';
      const comment = cleanedRow['comment'] || cleanedRow['description'] || '';
      const credit = parseFloat(cleanedRow['credit'] || '0');
      const debit = parseFloat(cleanedRow['debit'] || '0');

      // Extract date part (YYYY-MM-DD or DD/MM/YYYY)
      const txDate = txDateRaw.split(' ')[0] || new Date().toISOString().split('T')[0];

      // 1. Match Trade Executions from Cash Report comments (e.g. "Order 105: Sell 55 EDV @ $6.75")
      const tradeMatch = comment.match(/(Buy|Sell)\s+(\d+(?:\.\d+)?)\s+([A-Z0-9]+)\s+@\s+\$?(\d+(?:\.\d+)?)/i);
      if (tradeMatch) {
        const type = tradeMatch[1].toUpperCase();
        const qty = parseFloat(tradeMatch[2]);
        let rawTicker = tradeMatch[3].toUpperCase();
        const price = parseFloat(tradeMatch[4]);

        if (!rawTicker.endsWith('.AX')) rawTicker = `${rawTicker}.AX`;

        const assetId = await getOrCreateAsset(rawTicker, rawTicker, 'ASX_SHARE');
        await pool.query(
          `INSERT INTO transactions (asset_id, transaction_type, quantity, price_per_unit, brokerage, transaction_date)
           VALUES ($1, $2, $3, $4, 0, $5)`,
          [assetId, type, qty, price, txDate]
        );
        importedCount++;
        continue;
      }

      // 2. Match Brokerage Fee entries (e.g. "Order 105: Brokerage SELL EDV")
      const brokerageMatch = comment.match(/Brokerage\s+(BUY|SELL)\s+([A-Z0-9]+)/i);
      if (brokerageMatch) {
        let rawTicker = brokerageMatch[2].toUpperCase();
        if (!rawTicker.endsWith('.AX')) rawTicker = `${rawTicker}.AX`;
        const brokerageFee = debit || credit;

        await pool.query(
          `UPDATE transactions 
           SET brokerage = $1 
           WHERE id = (
             SELECT t.id FROM transactions t 
             JOIN assets a ON t.asset_id = a.id 
             WHERE a.ticker = $2 
             ORDER BY t.created_at DESC LIMIT 1
           )`,
          [brokerageFee, rawTicker]
        );
        continue;
      }

      // 3. Fallback: Standard SelfWealth Executed Trades CSV
      const rawSymbol = cleanedRow['symbol'] || cleanedRow['ticker'] || cleanedRow['code'];
      const type = cleanedRow['order type'] || cleanedRow['type'];
      const qty = parseFloat(cleanedRow['quantity'] || '0');
      const price = parseFloat(cleanedRow['price'] || '0');

      if (rawSymbol && !isNaN(qty) && qty > 0) {
        let ticker = rawSymbol.toUpperCase();
        if (!ticker.endsWith('.AX')) ticker = `${ticker}.AX`;

        const assetId = await getOrCreateAsset(ticker, ticker, 'ASX_SHARE');
        await pool.query(
          `INSERT INTO transactions (asset_id, transaction_type, quantity, price_per_unit, brokerage, transaction_date)
           VALUES ($1, $2, $3, $4, 0, $5)`,
          [assetId, (type || 'BUY').toUpperCase(), qty, price, txDate]
        );
        importedCount++;
      }
    }

    return NextResponse.json({ success: true, importedCount });
  } catch (error: any) {
    console.error('CSV API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
