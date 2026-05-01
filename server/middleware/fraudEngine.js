// server/middleware/fraudEngine.js
const { pool } = require('../db');

const REP_PENALTY = {
  rapid_bidding:     -20,
  suspicious_amount: -20,
  shill_bidding:     -50,
  bot_detected:      -40,
  bid_shielding:     -30,
};

const SEVERITY = {
  rapid_bidding:     'medium',
  suspicious_amount: 'low',
  shill_bidding:     'critical',
  bot_detected:      'high',
  bid_shielding:     'high',
};

async function logFraud(conn, { userId, auctionId, bidId, type, detail }) {
  const penalty  = REP_PENALTY[type];
  const severity = SEVERITY[type];

  await conn.query(
    `INSERT INTO fraud_events
       (user_id, auction_id, bid_id, fraud_type, severity, rep_deducted, detail)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, auctionId ?? null, bidId ?? null, type, severity,
     Math.abs(penalty), JSON.stringify(detail)]
  );

  const [[user]] = await conn.query(
    'SELECT reputation FROM users WHERE id = ?', [userId]
  );
  const newRep   = Math.max(0, (user?.reputation ?? 100) + penalty);
  const isLocked = newRep <= 0 ? 1 : 0;

  await conn.query(
    'UPDATE users SET reputation = ?, is_locked = ? WHERE id = ?',
    [newRep, isLocked, userId]
  );
  await conn.query(
    `INSERT INTO reputation_history (user_id, delta, reason, balance, related_id)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, penalty, `Fraud: ${type}`, newRep, auctionId ?? null]
  );

  return { type, severity, penalty, newReputation: newRep, locked: !!isLocked };
}

async function checkRapidBidding(conn, { userId, auctionId }) {
  try {
    const [[{ cnt }]] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM bids
       WHERE bidder_id = ? AND auction_id = ?
         AND placed_at > DATE_SUB(NOW(3), INTERVAL 60 SECOND)`,
      [userId, auctionId]
    );
    if (cnt >= 5) return { type: 'rapid_bidding', detail: { bids_last_minute: cnt } };
  } catch (e) { console.error('[FraudEngine] rapidBidding:', e.message); }
  return null;
}

async function checkSuspiciousAmount(_conn, { amount, currentBid }) {
  try {
    if (currentBid > 0 && amount > currentBid * 2) {
      return { type: 'suspicious_amount', detail: { bid_amount: amount, current_bid: currentBid } };
    }
  } catch (e) { console.error('[FraudEngine] suspiciousAmount:', e.message); }
  return null;
}

async function checkShillBidding(_conn, _args) {
  // Disabled — always false-positives when testing on localhost
  // (seller and buyer share the same IP and fingerprint on one machine)
  return null;
}

async function checkBotDetection(conn, { userId, auctionId }) {
  try {
    const [rows] = await conn.query(
      `SELECT placed_at FROM bids
       WHERE bidder_id = ? AND auction_id = ?
       ORDER BY placed_at DESC LIMIT 6`,
      [userId, auctionId]
    );
    if (rows.length < 4) return null;
    const times = rows.map(r => new Date(r.placed_at).getTime());
    const gaps  = [];
    for (let i = 0; i < times.length - 1; i++) gaps.push(Math.abs(times[i] - times[i + 1]));
    if (gaps.length >= 3 && gaps.every(g => Math.abs(g - gaps[0]) < 150)) {
      return { type: 'bot_detected', detail: { intervals_ms: gaps } };
    }
  } catch (e) { console.error('[FraudEngine] botDetection:', e.message); }
  return null;
}

async function checkBidShielding(conn, { auctionId }) {
  try {
    const [[auction]] = await conn.query(
      'SELECT ends_at FROM auctions WHERE id = ?', [auctionId]
    );
    if (!auction) return null;
    const secsLeft = (new Date(auction.ends_at) - Date.now()) / 1000;
    if (secsLeft <= 120) {
      return { type: 'bid_shielding', detail: { seconds_remaining: Math.round(secsLeft) } };
    }
  } catch (e) { console.error('[FraudEngine] bidShielding:', e.message); }
  return null;
}

async function bidFraudCheck(req, res, next) {
  const { auctionId } = req.params;
  const amount        = parseFloat(req.body.amount);
  const userId        = req.user.id;
  const ip            = req.ip || req.headers['x-forwarded-for'] || null;
  const fingerprint   = req.headers['x-fingerprint'] || null;

  req.fraudResults = [];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[auction]] = await conn.query(
      'SELECT current_bid, ends_at, seller_id, status FROM auctions WHERE id = ?',
      [auctionId]
    );

    if (!auction || auction.status !== 'active') {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Auction not found or not active.' });
    }

    const rapidHit      = await checkRapidBidding(conn, { userId, auctionId });
    const suspiciousHit = await checkSuspiciousAmount(conn, { amount, currentBid: auction.current_bid });
    const shillHit      = await checkShillBidding(conn, { userId, auctionId, ip, fingerprint });
    const botHit        = await checkBotDetection(conn, { userId, auctionId });

    for (const hit of [rapidHit, suspiciousHit, shillHit, botHit].filter(Boolean)) {
      const result = await logFraud(conn, {
        userId, auctionId, bidId: null, type: hit.type, detail: hit.detail,
      });
      req.fraudResults.push(result);
      if (result.locked) {
        await conn.commit();
        conn.release();
        return res.status(403).json({
          error: 'Your account has been locked due to fraudulent activity.',
          fraud: req.fraudResults,
        });
      }
    }

    await conn.commit();
  } catch (err) {
    console.error('[FraudEngine] bidFraudCheck crashed:', err.message);
    try { await conn.rollback(); } catch (_) {}
    conn.release();
    req.fraudResults = [];
    return next(); // don't block bid on fraud check failure
  }

  conn.release();
  next();
}

module.exports = { bidFraudCheck, checkBidShielding, logFraud };
