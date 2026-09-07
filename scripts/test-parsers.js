const fs = require('fs');
const readline = require('readline');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'sriraj',
  host: 'localhost',
  database: 'portfolio_db',
  port: 5432,
});

async function getOrCreateAsset(ticker, name, assetType) {
  let res = await pool.query('SELECT id FROM assets WHERE ticker = $1', [ticker]);
  if (res.rows.length > 0) return res.rows[0].id;

  let newAsset = await pool.query(
    'INSERT INTO assets (ticker, name, asset_type) VALUES ($1, $2, $3) RETURNING id',
    [ticker, name, assetType]
  );
  return newAsset.rows[0].id;
}

async function parseSelfWealth(filePath) {
  console.log(`\n--- Parsing SelfWealth: ${filePath} ---`);
  const lines = readline.createInterface({ input: fs.createReadStream(filePath) });
  let isHeader = true;

  for await (const line of lines) {
    if (isHeader) { isHeader = false; continue; }
    const [rawSymbol, type, qty, price, brokerage, date, assetType] = line.split(',');
    if (!rawSymbol) continue;

    let ticker = rawSymbol.trim();
    if (assetType !== 'US_SHARE' && !ticker.endsWith('.AX')) {
      ticker = `${ticker}.AX`;
    }

    const assetId = await getOrCreateAsset(ticker, ticker, assetType || 'ASX_SHARE');

    await pool.query(
      `INSERT INTO transactions (asset_id, transaction_type, quantity, price_per_unit, brokerage, transaction_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [assetId, type.toUpperCase(), parseFloat(qty), parseFloat(price), parseFloat(brokerage || 0), date]
    );

    console.log(`SelfWealth Loaded: ${type} ${qty}x ${ticker} @ $${price}`);
  }
}

async function parseVanguard(filePath) {
  console.log(`\n--- Parsing Vanguard: ${filePath} ---`);
  const lines = readline.createInterface({ input: fs.createReadStream(filePath) });
  let isHeader = true;

  for await (const line of lines) {
    if (isHeader) { isHeader = false; continue; }
    const [name, ticker, type, units, priceOrAmt, date, franking] = line.split(',');
    if (!ticker) continue;

    const cleanTicker = ticker.trim();
    const assetId = await getOrCreateAsset(cleanTicker, name.trim(), 'ETF');

    if (type.toUpperCase() === 'DIVIDEND') {
      await pool.query(
        `INSERT INTO dividends (asset_id, amount, franking_credits, payment_date)
         VALUES ($1, $2, $3, $4)`,
        [assetId, parseFloat(priceOrAmt), parseFloat(franking || 0), date]
      );
      console.log(`Vanguard Dividend Loaded: ${cleanTicker} $${priceOrAmt} (Franking: $${franking})`);
    } else {
      await pool.query(
        `INSERT INTO transactions (asset_id, transaction_type, quantity, price_per_unit, brokerage, transaction_date)
         VALUES ($1, $2, $3, $4, 0, $5)`,
        [assetId, type.toUpperCase(), parseFloat(units), parseFloat(priceOrAmt), date]
      );
      console.log(`Vanguard Trade Loaded: ${type} ${units}x ${cleanTicker}`);
    }
  }
}

async function parseCoinSpot(filePath) {
  console.log(`\n--- Parsing CoinSpot: ${filePath} ---`);
  const lines = readline.createInterface({ input: fs.createReadStream(filePath) });
  let isHeader = true;

  for await (const line of lines) {
    if (isHeader) { isHeader = false; continue; }
    const [market, type, amt, rate, totalAud, date] = line.split(',');
    if (!market) continue;

    const cleanTicker = market.trim().replace('/', '-');
    const assetId = await getOrCreateAsset(cleanTicker, cleanTicker.split('-')[0], 'CRYPTO');

    await pool.query(
      `INSERT INTO transactions (asset_id, transaction_type, quantity, price_per_unit, brokerage, transaction_date)
       VALUES ($1, $2, $3, $4, 0, $5)`,
      [assetId, type.toUpperCase(), parseFloat(amt), parseFloat(rate), date]
    );

    console.log(`CoinSpot Loaded: ${type} ${amt} ${cleanTicker} @ $${rate} AUD`);
  }
}

async function runTests() {
  try {
    await parseSelfWealth('test_selfwealth.csv');
    await parseVanguard('test_vanguard.csv');
    await parseCoinSpot('test_coinspot.csv');
    console.log('\n=========================================');
    console.log('✅ ALL TEST CSVS SUCCESSFULLY IMPORTED');
    console.log('=========================================');
  } catch (err) {
    console.error('Test Ingestion Failed:', err);
  } finally {
    await pool.end();
  }
}

runTests();
