// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const SECRET = process.env.JWT_SECRET || 'change_me_in_production_please';

/**
 * Attaches req.user from the Bearer token.
 * Returns 401/403 on failure.
 */
async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  const [[user]] = await pool.query(
    'SELECT id, username, email, role, reputation, is_locked, ip_address, fingerprint FROM users WHERE id = ?',
    [payload.sub]
  );

  if (!user) return res.status(401).json({ error: 'User not found.' });

  req.user = user;
  next();
}

/**
 * Guard that requires the user to have the 'seller' or 'both' role.
 */
function requireSeller(req, res, next) {
  if (!['seller', 'both'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Seller role required.' });
  }
  next();
}

/**
 * Guard that ensures the account is not locked.
 */
function requireUnlocked(req, res, next) {
  if (req.user?.is_locked) {
    return res.status(403).json({ error: 'Your account has been locked due to fraudulent activity.' });
  }
  next();
}

/**
 * Helper used by controllers to sign a fresh token.
 */
function signToken(userId) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: '7d' });
}

module.exports = { authMiddleware, requireSeller, requireUnlocked, signToken };
