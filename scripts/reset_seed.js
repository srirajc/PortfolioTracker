const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/portfolio_db',
});

async function resetAndSeed() {
  try {
    console.log("Cleaning and re-seeding portfolio data...");

    // Clear old data
    await pool.query('TRUNCATE TABLE transactions, income_events, assets RESTART IDENTITY CASCADE;');

    // Insert Assets
    const vasRes = await pool.query(`
      INSERT INTO assets (ticker, name, asset_type, currency)
      VALUES ('VAS.AX', 'Vanguard Australian Shares Index ETF', 'ETF', 'AUD')
      RETURNING id;
    `);
    const vasId = vasRes.rows[0].id;

    const bhpRes = await pool.query(`
      INSERT INTO assets (ticker, name, asset_type, currency)
      VALUES ('BHP.AX', 'BHP Group Limited', 'ASX_SHARE', 'AUD')
      RETURNING id;
    `);
    const bhpId = bhpRes.rows[0].id;

    await pool.query(`
      INSERT INTO assets (ticker, name, asset_type, currency)
      VALUES ('CBA.AX', 'Commonwealth Bank of Australia', 'ASX_SHARE', 'AUD');
    `);

    // Insert Transactions
    await pool.query(`
      INSERT INTO transactions (asset_id, transaction_type, quantity, price_per_unit, brokerage, transaction_date, notes)
      VALUES 
        (${vasId}, 'BUY', 100, 88.50, 9.95, '2023-07-15', 'Initial VAS purchase'),
        (${vasId}, 'BUY', 50, 91.20, 9.95, '2024-02-10', 'DCA purchase'),
        (${bhpId}, 'BUY', 200, 42.10, 14.95, '2023-11-01', 'BHP long term position');
    `);

    console.log("Data reset and successfully seeded!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

resetAndSeed();
