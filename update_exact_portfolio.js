const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'sriraj',
  host: 'localhost',
  database: 'portfolio_db',
  port: 5432,
});

// Your exact actual holdings
const verifiedHoldings = [
  { ticker: 'WOW', name: 'Woolworths Group Ltd', type: 'STOCKS', qty: 386, avgCost: 40.00 },
  { ticker: 'CRYP', name: 'BetaShares Crypto Innovators ETF', type: 'STOCKS', qty: 410, avgCost: 8.24 },
  { ticker: 'VDHG', name: 'Vanguard Diversified High Growth ETF', type: 'STOCKS', qty: 65, avgCost: 58.50 },
  { ticker: 'MQG', name: 'Macquarie Group Ltd', type: 'STOCKS', qty: 303, avgCost: 185.20 },
  { ticker: 'TCL', name: 'Transurban Group', type: 'STOCKS', qty: 526, avgCost: 12.80 },
  { ticker: 'FANG', name: 'Global X FANG+ ETF', type: 'STOCKS', qty: 550, avgCost: 18.90 },
  { ticker: 'NDIA', name: 'Global X India Nifty 50 ETF', type: 'STOCKS', qty: 480, avgCost: 10.15 }
];

async function syncPortfolio() {
  try {
    console.log('Purging unwanted assets and syncing verified portfolio...\n');

    // Wipe old records completely to remove BTC, PLL, or legacy items
    await pool.query('TRUNCATE TABLE transactions, assets RESTART IDENTITY CASCADE;');

    for (const item of verifiedHoldings) {
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

      console.log(`✅ Locked ${item.ticker}: ${item.qty} units @ $${item.avgCost.toFixed(2)} AUD`);
    }

    console.log('\nPortfolio successfully synced!');
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

syncPortfolio();
