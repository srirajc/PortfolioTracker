const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'sriraj',
  host: 'localhost',
  database: 'portfolio_db',
  port: 5432,
});

// Full updated portfolio list with exact buy prices
const completePortfolio = [
  // Existing verified holdings
  { ticker: 'WOW', name: 'Woolworths Group Ltd', type: 'STOCKS', qty: 386, avgCost: 40.00 },
  { ticker: 'CRYP', name: 'BetaShares Crypto Innovators ETF', type: 'STOCKS', qty: 410, avgCost: 8.24 },
  { ticker: 'VDHG', name: 'Vanguard Diversified High Growth ETF', type: 'STOCKS', qty: 65, avgCost: 58.50 },
  { ticker: 'MQG', name: 'Macquarie Group Ltd', type: 'STOCKS', qty: 303, avgCost: 185.20 },
  { ticker: 'TCL', name: 'Transurban Group', type: 'STOCKS', qty: 526, avgCost: 12.80 },
  { ticker: 'FANG', name: 'Global X FANG+ ETF', type: 'STOCKS', qty: 550, avgCost: 18.90 },
  { ticker: 'NDIA', name: 'Global X India Nifty 50 ETF', type: 'STOCKS', qty: 480, avgCost: 10.15 },

  // Added holdings
  { ticker: 'NAB', name: 'National Australia Bank Ltd', type: 'STOCKS', qty: 300, avgCost: 34.00 },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', type: 'US_STOCKS', qty: 57, avgCost: 115.00 },
  { ticker: 'SPCX', name: 'Sanlam Global Convertible Bond Fund / SPCX', type: 'STOCKS', qty: 42, avgCost: 25.00 },
  { ticker: 'ANAT', name: 'Anatara Lifesciences Ltd', type: 'STOCKS', qty: 5, avgCost: 0.10 },
  { ticker: 'TSLA', name: 'Tesla Inc', type: 'US_STOCKS', qty: 1, avgCost: 220.00 }
];

async function updateAll() {
  try {
    console.log('Syncing complete portfolio into PostgreSQL...\n');

    await pool.query('TRUNCATE TABLE transactions, assets RESTART IDENTITY CASCADE;');

    for (const item of completePortfolio) {
      const newAsset = await pool.query(
        'INSERT INTO assets (ticker, name, asset_type) VALUES ($1, $2, $3) RETURNING id',
        [item.ticker, item.name, item.type]
      );
      const assetId = newAsset.rows[0].id;

      await pool.query(
        `INSERT INTO transactions (asset_id, transaction_type, quantity, price_per_unit, brokerage, transaction_date)
         VALUES ($1, 'BUY', $2, $3, 0, NOW())`,
        [assetId, item.qty, item.avgCost]
      );

      console.log(`✅ Added ${item.ticker}: ${item.qty} units @ $${item.avgCost.toFixed(2)} AUD`);
    }

    console.log('\nAll holdings successfully populated!');
    process.exit(0);
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  }
}

updateAll();
