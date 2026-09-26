import { Pool } from 'pg';

export interface FullAssetDetail {
  id: string;
  symbol: string;
  name: string;
  type: string;
  description: string;
  metrics: {
    currentPrice: number;
    priceChange24h: number;
    currency: string;
  };
  holding: {
    unitsHeld: number;
    avgBuyPrice: number;
  };
}

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'sriraj',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'portfolio_db',
  password: process.env.POSTGRES_PASSWORD || '',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
});

export async function getAssetDetailById(id: string): Promise<FullAssetDetail | null> {
  try {
    const query = `
      SELECT 
        a.id,
        a.ticker AS symbol,
        a.name,
        a.asset_type AS type,
        a.currency,
        SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END) AS units,
        SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity * t.price_per_unit ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE 0 END), 0) AS avg_buy_price
      FROM assets a
      LEFT JOIN transactions t ON a.id = t.asset_id
      WHERE LOWER(a.id::text) = $1 OR LOWER(a.ticker) = $1
      GROUP BY a.id, a.ticker, a.name, a.asset_type, a.currency;
    `;

    const { rows } = await pool.query(query, [id.toLowerCase()]);
    if (rows.length === 0) return null;

    const row = rows[0];
    const avgBuyPrice = parseFloat(row.avg_buy_price || '0');

    return {
      id: String(row.id),
      symbol: row.symbol,
      name: row.name,
      type: row.type,
      description: `${row.name} (${row.symbol}) portfolio tracking asset record.`,
      metrics: {
        currentPrice: avgBuyPrice,
        priceChange24h: 0.0,
        currency: row.currency || 'AUD',
      },
      holding: {
        unitsHeld: parseFloat(row.units || '0'),
        avgBuyPrice: avgBuyPrice,
      },
    };
  } catch (error) {
    console.error('Failed to fetch asset detail from database:', error);
    return null;
  }
}
