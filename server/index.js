// server/index.js
require('dotenv').config();
const express   = require('express');
const http      = require('http');
const { Server }= require('socket.io');
const cors      = require('cors');
const helmet    = require('helmet');

const { initSchema } = require('./db');
const routes         = require('./routes');
const { finaliseAuction } = require('./controllers/bidController');
const { pool }       = require('./db');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});

// ── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.set('io', io);

// ── Routes ───────────────────────────────────────────────────
app.use('/api', routes);

// ── Socket.io ────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join_auction', (auctionId) => {
    socket.join(`auction:${auctionId}`);
  });
  socket.on('leave_auction', (auctionId) => {
    socket.leave(`auction:${auctionId}`);
  });
});

// ── Auction Finaliser — runs every 15 s ──────────────────────
async function runFinaliser() {
  try {
    const [expired] = await pool.query(
      'SELECT id FROM auctions WHERE status = "active" AND ends_at <= NOW()'
    );
    for (const { id } of expired) {
      await finaliseAuction(id);
      io.emit('auction_ended', { auctionId: id });
      console.log(`[Finaliser] Auction ${id} ended.`);
    }
  } catch (err) {
    console.error('[Finaliser] Error:', err.message);
  }
}
setInterval(runFinaliser, 15_000);

// ── Error Handler ────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error.', detail: err.message });
});

// ── Boot ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
(async () => {
  await initSchema();
  server.listen(PORT, () => console.log(`[Server] Listening on http://localhost:${PORT}`));
})();
