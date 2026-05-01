// server/db/index.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306'),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'auction_db',
  waitForConnections: true,
  connectionLimit:    20,
  queueLimit:         0,
  timezone:           '+00:00',
  decimalNumbers:     true,
});

/**
 * Verifies the DB connection and that the core tables exist.
 *
 * The schema must be applied manually BEFORE starting the server:
 *   mysql -u root -p auction_db < server/db/schema.sql
 */
async function initSchema() {
  const conn = await pool.getConnection();
  try {
    await conn.query('SELECT 1');

    const [rows] = await conn.query(`
      SELECT COUNT(*) AS cnt
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
    `);

    if (rows[0].cnt === 0) {
      console.error('');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('  DATABASE SCHEMA NOT FOUND');
      console.error('  Run this command first, then restart the server:');
      console.error('');
      console.error('  mysql -u root -p auction_db < server/db/schema.sql');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      process.exit(1);
    }

    console.log('[DB] Connected successfully. Schema OK.');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initSchema };
