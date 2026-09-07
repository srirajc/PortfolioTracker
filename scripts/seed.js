const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/portfolio_db',
});

async function seed() {
  try {
    console.log("Seeding sample Australian assets and transactions...");

    // Insert Sample Assets
    const assetsRes = await pool.query(`
      INSERT INTO assets (ticker, name, asset_type, currency)
      VALUES 
        ('VAS.AX', 'Vanguard Australian Shares Index ETF', 'ETF', 'AUD'),
        ('BHP.AX', 'BHP Group Limited', 'ASX_SHARE', 'AUD'),
        ('CBA.AX', 'Commonwealth Bank of Australia', 'ASX_SHARE', 'AUD')
      ON CONFLICT (ticker) DO NOTHING
      RETURNING id, ticker;
    `);

    // Get asset IDs
    const assets = await pool.query('SELECT id, ticker FROM assets;');
    const vas = assets.rows.find(a => a.ticker === 'VAS.AX');
    const bhp = assets.rows.find(a => a.ticker === 'BHP.AX');

    if (vas) {
      await pool.query(`
        INSERT INTO transactions (asset_id, transaction_type, quantity, price_per_unit, brokerage, transaction_date, notes)
        VALUES 
          (${vas.id}, 'BUY', 100, 88.50, 9.95, '2023-07-15', 'Initial VAS purchase'),
          (${vas.id}, 'BUY', 50, 91.20, 9.95, '2024-02-10', 'DCA purchase');
      `);
    }

    if (bhp) {
      await pool.query(`
        INSERT INTO transactions (asset_id, transaction_type, quantity, price_per_unit, brokerage, transaction_date, notes)
        VALUES 
          (${bhp.id}, 'BUY', 200, 42.10, 14.95, '2023-11-01', 'BHP long term position');
      `);
    }

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
