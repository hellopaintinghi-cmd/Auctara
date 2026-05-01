// server/routes/index.js
const router = require('express').Router();
const { authMiddleware, requireSeller, requireUnlocked } = require('../middleware/auth');
const { bidFraudCheck } = require('../middleware/fraudEngine');

const auth    = require('../controllers/authController');
const auction = require('../controllers/auctionController');
const bid     = require('../controllers/bidController');

// ── Auth ────────────────────────────────────────────────────
router.post('/auth/register', auth.register);
router.post('/auth/login',    auth.login);
router.get ('/auth/profile',  authMiddleware, auth.getProfile);

// ── Auctions ────────────────────────────────────────────────
router.get ('/auctions',              auction.listAuctions);
router.get ('/auctions/categories',   auction.getCategories);
router.get ('/auctions/:id',          auction.getAuction);
router.post('/auctions',              authMiddleware, requireSeller, auction.createAuction);

// ── Bids ────────────────────────────────────────────────────
router.post(
  '/auctions/:auctionId/bids',
  authMiddleware,
  requireUnlocked,
  bidFraudCheck,
  bid.placeBid
);
router.delete(
  '/auctions/:auctionId/bids',
  authMiddleware,
  requireUnlocked,
  bid.withdrawBid
);

module.exports = router;
