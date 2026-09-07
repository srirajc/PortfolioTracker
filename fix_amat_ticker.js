const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'sriraj',
  host: 'localhost',
  database: 'portfolio_db',
  port: 5432,
});

async function fixTicker() {
  try {
    console.log('Updating ticker ANAT -> AMAT in PostgreSQL...');

    // Update asset ticker and name
    await pool.query(
      `UPDATE assets 
       SET ticker = 'AMAT', name = 'Applied Materials Inc', asset_type = 'US_STOCKS' 
       WHERE ticker = 'ANAT'`
    );

    console.log('✅ Successfully updated ticker to AMAT!');
    process.exit(0);
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  }
}

fixTicker();
