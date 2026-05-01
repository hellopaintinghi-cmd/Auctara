// server/controllers/bidController.js
/**
 * Place a bid — wrapped in a MySQL transaction to prevent race conditions.
 * Fraud checks have already run via bidFraudCheck middleware.
 */
const { pool } = require('../db');
const { checkBidShielding, logFraud } = require('../middleware/fraudEngine');

async function placeBid(req, res) {
  const auctionId = parseInt(req.params.auctionId);
  const bidAmount = parseFloat(req.body.amount);
  const userId    = req.user.id;
  const ip        = req.ip || req.headers['x-forwarded-for'];
  const fp        = req.headers['x-fingerprint'] || null;

  if (isNaN(bidAmount) || bidAmount <= 0) {
    return res.status(400).json({ error: 'Invalid bid amount.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the auction row
    const [[auction]] = await conn.query(
      `SELECT id, seller_id, current_bid, reserve_price, ends_at, status
       FROM auctions WHERE id = ? FOR UPDATE`,
      [auctionId]
    );

    // Count existing bids to distinguish first bid from subsequent
    const [[{ bidCount }]] = await conn.query(
      'SELECT COUNT(*) AS bidCount FROM bids WHERE auction_id = ?',
      [auctionId]
    );
    const bids = { length: bidCount };

    if (!auction || auction.status !== 'active') {
      await conn.rollback();
      return res.status(400).json({ error: 'Auction is not active.' });
    }
    if (new Date(auction.ends_at) <= new Date()) {
      await conn.rollback();
      return res.status(400).json({ error: 'Auction has ended.' });
    }
    if (auction.seller_id === userId) {
      await conn.rollback();
      return res.status(403).json({ error: 'Sellers cannot bid on their own auctions.' });
    }
    if (bidAmount < auction.current_bid) {
      await conn.rollback();
      return res.status(400).json({ error: `Bid must be at least $${Number(auction.current_bid).toFixed(2)}.` });
    }
    if (bids.length > 0 && bidAmount <= auction.current_bid) {
      await conn.rollback();
      return res.status(400).json({ error: `Bid must exceed current bid of $${Number(auction.current_bid).toFixed(2)}.` });
    }

    // Mark previous winning bid as no longer winning
    await conn.query(
      'UPDATE bids SET is_winning = 0 WHERE auction_id = ? AND is_winning = 1',
      [auctionId]
    );

    // Insert the new bid
    const [bidResult] = await conn.query(
      `INSERT INTO bids (auction_id, bidder_id, amount, ip_address, fingerprint, is_winning)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [auctionId, userId, bidAmount, ip, fp]
    );
    const bidId = bidResult.insertId;

    // Update auction's current bid and provisional winner
    await conn.query(
      'UPDATE auctions SET current_bid = ?, current_winner = ? WHERE id = ?',
      [bidAmount, userId, auctionId]
    );

    await conn.commit();

    // Emit real-time update via Socket.io (attached to app)
    const io = req.app.get('io');
    if (io) {
      io.to(`auction:${auctionId}`).emit('bid_update', {
        auctionId,
        newBid: bidAmount,
        bidder: req.user.username,
        timestamp: new Date().toISOString(),
        fraudWarnings: req.fraudResults || [],
      });
    }

    return res.json({
      success: true,
      bidId,
      newBid: bidAmount,
      fraudWarnings: req.fraudResults || [],
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Withdraw a bid (only allowed if > 2 min remaining).
 * Checks for bid shielding and logs if detected.
 */
async function withdrawBid(req, res) {
  const auctionId = parseInt(req.params.auctionId);
  const userId    = req.user.id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Bid-shielding check
    const shieldHit = await checkBidShielding(conn, { auctionId });
    if (shieldHit) {
      const result = await logFraud(conn, {
        userId, auctionId, bidId: null,
        type: 'bid_shielding', detail: shieldHit.detail,
      });
      await conn.commit();
      return res.status(403).json({
        error: 'Bid withdrawal is not allowed in the final 2 minutes of an auction.',
        fraud: result,
      });
    }

    // Remove only the latest winning bid by this user
    const [[bid]] = await conn.query(
      `SELECT id FROM bids
       WHERE auction_id = ? AND bidder_id = ? AND is_winning = 1
       ORDER BY placed_at DESC LIMIT 1`,
      [auctionId, userId]
    );

    if (!bid) {
      await conn.rollback();
      return res.status(404).json({ error: 'No active winning bid to withdraw.' });
    }

    await conn.query('DELETE FROM bids WHERE id = ?', [bid.id]);

    // Find next highest bid
    const [[nextBid]] = await conn.query(
      `SELECT id, bidder_id, amount FROM bids
       WHERE auction_id = ?
       ORDER BY amount DESC LIMIT 1`,
      [auctionId]
    );

    if (nextBid) {
      await conn.query(
        'UPDATE bids SET is_winning = 1 WHERE id = ?',
        [nextBid.id]
      );
      await conn.query(
        'UPDATE auctions SET current_bid = ?, current_winner = ? WHERE id = ?',
        [nextBid.amount, nextBid.bidder_id, auctionId]
      );
    } else {
      const [[auction]] = await conn.query('SELECT starting_price FROM auctions WHERE id = ?', [auctionId]);
      await conn.query(
        'UPDATE auctions SET current_bid = ?, current_winner = NULL WHERE id = ?',
        [auction.starting_price, auctionId]
      );
    }

    await conn.commit();

    const io = req.app.get('io');
    if (io) {
      io.to(`auction:${auctionId}`).emit('bid_withdrawn', {
        auctionId,
        newBid: nextBid?.amount || null,
      });
    }

    return res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Called by the auction-ending cron / scheduler.
 * Finalises winner and awards reputation points.
 */
async function finaliseAuction(auctionId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[auction]] = await conn.query(
      'SELECT * FROM auctions WHERE id = ? AND status = "active" FOR UPDATE',
      [auctionId]
    );
    if (!auction) { await conn.rollback(); return; }

    await conn.query('UPDATE auctions SET status = "ended" WHERE id = ?', [auctionId]);

    if (auction.current_winner && auction.current_bid >= auction.reserve_price) {
      // Award winner +10 reputation
      const [[winner]] = await conn.query(
        'SELECT reputation FROM users WHERE id = ? FOR UPDATE',
        [auction.current_winner]
      );
      const newRep = winner.reputation + 10;
      await conn.query('UPDATE users SET reputation = ? WHERE id = ?', [newRep, auction.current_winner]);
      await conn.query(
        `INSERT INTO reputation_history (user_id, delta, reason, balance, related_id)
         VALUES (?, 10, 'Won auction', ?, ?)`,
        [auction.current_winner, newRep, auctionId]
      );

      await conn.query(
        `INSERT INTO notifications (user_id, type, message)
         VALUES (?, 'auction_won', ?)`,
        [auction.current_winner, `Congratulations! You won auction: "${auction.title}" with a bid of $${auction.current_bid}.`]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { placeBid, withdrawBid, finaliseAuction };
