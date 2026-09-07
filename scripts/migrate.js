const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/portfolio_db',
});

async function migrate() {
  try {
    console.log("Creating database tables...");

    await pool.query(`
      -- Assets Table
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        asset_type VARCHAR(20) CHECK (asset_type IN ('ASX_SHARE', 'US_SHARE', 'ETF', 'CRYPTO')),
        currency VARCHAR(3) DEFAULT 'AUD',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Transactions Table (Buys / Sells)
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
        transaction_type VARCHAR(4) CHECK (transaction_type IN ('BUY', 'SELL')),
        quantity NUMERIC(14, 6) NOT NULL,
        price_per_unit NUMERIC(14, 4) NOT NULL,
        brokerage NUMERIC(10, 2) DEFAULT 0.00,
        transaction_date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Dividends / Income Table
      CREATE TABLE IF NOT EXISTS income_events (
        id SERIAL PRIMARY KEY,
        asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
        amount_aud NUMERIC(12, 2) NOT NULL,
        franked_amount NUMERIC(12, 2) DEFAULT 0.00,
        franking_credits NUMERIC(12, 2) DEFAULT 0.00,
        payment_date DATE NOT NULL,
        financial_year VARCHAR(7) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Schema migration complete! Tables created successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
