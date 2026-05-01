// server/scripts/unlockAccounts.js
// Run with: node scripts/unlockAccounts.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../db');

async function main() {
  console.log('Unlocking all locked accounts and resetting reputation to 100...\n');

  const [locked] = await pool.query(
    'SELECT id, username, reputation, is_locked FROM users WHERE is_locked = 1 OR reputation <= 0'
  );

  if (locked.length === 0) {
    console.log('No locked accounts found.');
  } else {
    for (const u of locked) {
      await pool.query(
        'UPDATE users SET is_locked = 0, reputation = 100 WHERE id = ?',
        [u.id]
      );
      await pool.query(
        `INSERT INTO reputation_history (user_id, delta, reason, balance)
         VALUES (?, ?, 'Admin reset — unlocked for testing', 100)`,
        [u.id, 100 - (u.reputation ?? 0)]
      );
      console.log(`✓ Unlocked: ${u.username} (was reputation=${u.reputation})`);
    }
  }

  // Also clear all fraud events so the UI is clean
  await pool.query('DELETE FROM fraud_events');
  console.log('\n✓ Cleared all fraud events.');
  console.log('\nDone. Restart the server and try again.');
  process.exit(0);
}

main().catch(err => { console.error(err.message); process.exit(1); });
