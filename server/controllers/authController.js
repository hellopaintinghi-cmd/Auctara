// server/controllers/authController.js
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { signToken } = require('../middleware/auth');

async function register(req, res) {
  const { username, email, password, role = 'buyer' } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (!['buyer', 'seller', 'both'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }

  const hash = await bcrypt.hash(password, 12);
  const ip   = req.ip || req.headers['x-forwarded-for'];
  const fp   = req.headers['x-fingerprint'] || null;

  try {
    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, ip_address, fingerprint)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, hash, role, ip, fp]
    );

    const userId = result.insertId;

    // Seed reputation history
    await pool.query(
      `INSERT INTO reputation_history (user_id, delta, reason, balance) VALUES (?, ?, ?, ?)`,
      [userId, 100, 'Account created', 100]
    );

    const token = signToken(userId);
    return res.status(201).json({ token, userId, username, role });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email or username already taken.' });
    }
    throw err;
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }

  const [[user]] = await pool.query(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

  // Update IP / fingerprint on login
  const ip = req.ip || req.headers['x-forwarded-for'];
  const fp = req.headers['x-fingerprint'] || user.fingerprint;
  await pool.query('UPDATE users SET ip_address = ?, fingerprint = ? WHERE id = ?', [ip, fp, user.id]);

  const token = signToken(user.id);
  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      reputation: user.reputation,
      is_locked: user.is_locked,
    },
  });
}

async function getProfile(req, res) {
  const userId = req.user.id;

  const [[stats]] = await pool.query(
    'SELECT * FROM v_user_stats WHERE id = ?',
    [userId]
  );

  // Also return the full user row so the frontend has role, email, etc.
  const [[user]] = await pool.query(
    'SELECT id, username, email, role, reputation, is_locked FROM users WHERE id = ?',
    [userId]
  );

  const [repHistory] = await pool.query(
    `SELECT delta, reason, balance, created_at
     FROM reputation_history WHERE user_id = ?
     ORDER BY created_at DESC LIMIT 20`,
    [userId]
  );

  const [fraudHistory] = await pool.query(
    `SELECT fraud_type, severity, rep_deducted, detected_at, detail
     FROM fraud_events WHERE user_id = ?
     ORDER BY detected_at DESC LIMIT 10`,
    [userId]
  );

  const [myAuctions] = await pool.query(
    `SELECT id, title, current_bid, status, ends_at FROM auctions
     WHERE seller_id = ? ORDER BY created_at DESC LIMIT 10`,
    [userId]
  );

  const [myBids] = await pool.query(
    `SELECT b.id, b.amount, b.is_winning, b.placed_at,
            a.id AS auction_id, a.title, a.status, a.ends_at
     FROM bids b JOIN auctions a ON a.id = b.auction_id
     WHERE b.bidder_id = ?
     ORDER BY b.placed_at DESC LIMIT 20`,
    [userId]
  );

  return res.json({ user, stats, repHistory, fraudHistory, myAuctions, myBids });
}

module.exports = { register, login, getProfile };
