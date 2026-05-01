// server/controllers/auctionController.js
const { pool } = require('../db');

async function listAuctions(req, res) {
  const { category, search, page = 1, limit = 12 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = 'WHERE a.status = "active" AND a.ends_at > NOW()';
  const params = [];

  if (category) {
    where += ' AND c.slug = ?';
    params.push(category);
  }
  if (search) {
    where += ' AND (a.title LIKE ? OR a.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const [auctions] = await pool.query(
    `SELECT a.id, a.title, a.image_url, a.starting_price, a.current_bid,
            a.reserve_price, a.ends_at, a.status,
            u.username AS seller_name, u.reputation AS seller_rep,
            c.name AS category_name, c.slug AS category_slug,
            TIMESTAMPDIFF(SECOND, NOW(), a.ends_at) AS seconds_remaining,
            COUNT(b.id) AS bid_count
     FROM auctions a
     JOIN users      u ON u.id = a.seller_id
     JOIN categories c ON c.id = a.category_id
     LEFT JOIN bids  b ON b.auction_id = a.id
     ${where}
     GROUP BY a.id
     ORDER BY a.ends_at ASC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM auctions a JOIN categories c ON c.id = a.category_id ${where}`,
    params
  );

  return res.json({ auctions, total, page: parseInt(page), limit: parseInt(limit) });
}

async function getAuction(req, res) {
  const { id } = req.params;

  const [[auction]] = await pool.query(
    `SELECT a.*, u.username AS seller_name, u.reputation AS seller_rep,
            c.name AS category_name,
            TIMESTAMPDIFF(SECOND, NOW(), a.ends_at) AS seconds_remaining
     FROM auctions a
     JOIN users      u ON u.id = a.seller_id
     JOIN categories c ON c.id = a.category_id
     WHERE a.id = ?`,
    [id]
  );
  if (!auction) return res.status(404).json({ error: 'Auction not found.' });

  const [bids] = await pool.query(
    `SELECT b.amount, b.placed_at, u.username AS bidder
     FROM bids b JOIN users u ON u.id = b.bidder_id
     WHERE b.auction_id = ?
     ORDER BY b.placed_at DESC LIMIT 50`,
    [id]
  );

  return res.json({ auction, bids });
}

async function createAuction(req, res) {
  const {
    title, description, image_url, category_id = 7,
    starting_price, reserve_price, starts_at, ends_at,
  } = req.body;

  if (!title || !starting_price || !reserve_price || !ends_at) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  if (parseFloat(reserve_price) < parseFloat(starting_price)) {
    return res.status(400).json({ error: 'Reserve price must be ≥ starting price.' });
  }

  const startsAtValue = starts_at || new Date().toISOString().slice(0, 19).replace('T', ' ');

  const [result] = await pool.query(
    `INSERT INTO auctions
     (seller_id, category_id, title, description, image_url,
      starting_price, reserve_price, current_bid, status, starts_at, ends_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    [
      req.user.id, category_id, title, description || null, image_url || null,
      starting_price, reserve_price, starting_price,
      startsAtValue, ends_at,
    ]
  );

  return res.status(201).json({ id: result.insertId, message: 'Auction created.' });
}

async function getCategories(req, res) {
  const [cats] = await pool.query('SELECT * FROM categories ORDER BY name');
  return res.json(cats);
}

module.exports = { listAuctions, getAuction, createAuction, getCategories };
