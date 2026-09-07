const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'sriraj',
  host: 'localhost',
  database: 'portfolio_db',
  port: 5432,
});

const holdingsData = [
  { ticker: 'VDHG', name: 'Vanguard Diversified High Growth ETF', type: 'STOCKS', qty: 65, avgCost: 58.50 },
  { ticker: 'MQG', name: 'Macquarie Group Ltd', type: 'STOCKS', qty: 303, avgCost: 185.20 },
  { ticker: 'TCL', name: 'Transurban Group', type: 'STOCKS', qty: 526, avgCost: 12.80 },
  { ticker: 'WOW', name: 'Woolworths Group Ltd', type: 'STOCKS', qty: 386, avgCost: 32.40 },
  { ticker: 'FANG', name: 'Global X FANG+ ETF', type: 'STOCKS', qty: 550, avgCost: 18.90 },
  { ticker: 'NDIA', name: 'Global X India Nifty 50 ETF', type: 'STOCKS', qty: 480, avgCost: 10.15 },
  { ticker: 'CRYP', name: 'BetaShares Crypto Innovators ETF', type: 'STOCKS', qty: 410, avgCost: 4.20 },
  { ticker: 'PLL', name: 'Piedmont Lithium Inc', type: 'STOCKS', qty: 1800, avgCost: 0.45 },
  { ticker: 'BTC', name: 'Bitcoin', type: 'CRYPTO', qty: 0.02, avgCost: 95000.00 }
];

async function seed() {
  try {
    console.log('Seeding database with verified portfolio holdings...');

    for (const item of holdingsData) {
      let assetRes = await pool.query('SELECT id FROM assets WHERE ticker = $1', [item.ticker]);
      let assetId;

      if (assetRes.rows.length === 0) {
        const newAsset = await pool.query(
          'INSERT INTO assets (ticker, name, asset_type) VALUES ($1, $2, $3) RETURNING id',
          [item.ticker, item.name, item.type]
        );
        assetId = newAsset.rows[0].id;
      } else {
        assetId = assetRes.rows[0].id;
      }

      await pool.query(
        `INSERT INTO transactions (asset_id, transaction_type, quantity, price_per_unit, brokerage, transaction_date)
         VALUES ($1, 'BUY', $2, $3, 0, NOW())`,
        [assetId, item.qty, item.avgCost]
      );
      
      console.log(`✅ Seeded ${item.ticker}: ${item.qty} units @ $${item.avgCost}`);
    }

    console.log('\nSeeding Complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding Failed:', err);
    process.exit(1);
  }
}

seed();
