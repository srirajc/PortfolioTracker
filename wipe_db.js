const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'sriraj',
  host: 'localhost',
  database: 'portfolio_db',
  port: 5432,
});

async function clean() {
  try {
    await pool.query('DELETE FROM transactions;');
    await pool.query('DELETE FROM assets;');
    console.log('✅ Database successfully cleaned!');
  } catch (err) {
    console.error('Error cleaning database:', err);
  } finally {
    await pool.end();
  }
}
clean();
