const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'sriraj',
  host: 'localhost',
  database: 'portfolio_db',
  port: 5432,
});

async function check() {
  const query = `
    SELECT 
      a.ticker,
      a.asset_type,
      SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END)::numeric as total_quantity,
      SUM(CASE WHEN t.transaction_type = 'BUY' 
               THEN (t.quantity * t.price_per_unit) + COALESCE(t.brokerage, 0)
               ELSE -((t.quantity * t.price_per_unit) - COALESCE(t.brokerage, 0)) END)::numeric as net_invested
    FROM assets a
    JOIN transactions t ON a.id = t.asset_id
    GROUP BY a.ticker, a.asset_type
    HAVING SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END) > 0.0001;
  `;
  const res = await pool.query(query);
  console.log('=== DB Holdings Summary ===');
  console.table(res.rows);
  await pool.end();
}
check();
