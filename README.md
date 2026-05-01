# Auctara — Online Auction System with Fraud Detection Engine

> A production-grade full-stack auction platform with a real-time "Red Alert" Fraud Detection Engine, Reputation System, and live bidding via Socket.io.

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, Lucide-React, Socket.io-client |
| Backend    | Node.js, Express.js, Socket.io          |
| Database   | MySQL 8.0+ (`mysql2/promise` async/await) |
| Auth       | JWT (jsonwebtoken + bcryptjs)           |
| Real-time  | WebSocket via Socket.io                 |

---

## Project Structure

```
auction-system/
├── client/                         # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Sticky nav with reputation badge
│   │   │   ├── AuctionCard.jsx     # Live countdown card
│   │   │   ├── ReputationMeter.jsx # SVG arc gauge
│   │   │   └── FraudAlert.jsx      # Red Alert banner component
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Global user state
│   │   ├── hooks/
│   │   │   ├── useSocket.js        # Socket.io room subscription
│   │   │   └── useCountdown.js     # Live countdown timer
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── AuctionList.jsx     # Browse + filter
│   │   │   ├── AuctionDetail.jsx   # Live bidding UI
│   │   │   ├── CreateAuction.jsx   # Seller form
│   │   │   └── Dashboard.jsx       # Profile + Fraud log + Rep history
│   │   └── utils/
│   │       └── api.js              # Axios + fingerprint header
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── server/                         # Express backend
    ├── db/
    │   ├── schema.sql              # Full normalized MySQL schema
    │   └── index.js                # Pool + initSchema()
    ├── middleware/
    │   ├── auth.js                 # JWT auth, role guards
    │   └── fraudEngine.js          # 5-check Fraud Detection Engine
    ├── controllers/
    │   ├── authController.js       # register / login / profile
    │   ├── auctionController.js    # CRUD + listing
    │   └── bidController.js        # Transactional bidding + finaliser
    ├── routes/
    │   └── index.js                # All API routes
    ├── index.js                    # Server entry + Socket.io + cron
    ├── .env.example
    └── package.json
```

---

## Prerequisites

- **Node.js** 18+ and **npm** 9+
- **MySQL** 8.0+ running locally (or a remote instance)
- A MySQL user with `CREATE DATABASE` / full privileges

---

## Setup Guide

### 1. Clone / download the project

```bash
git clone <your-repo-url> auction-system
cd auction-system
```

### 2. Create the MySQL database

```sql
-- Run in your MySQL client (mysql -u root -p)
CREATE DATABASE auction_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> **Note:** The server will auto-run `schema.sql` on startup via `initSchema()`.  
> All `CREATE TABLE` statements use `IF NOT EXISTS`, so it's fully idempotent.

### 3. Configure the server environment

```bash
cd server
cp .env.example .env
```

Edit `.env`:

```env
PORT=4000
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=auction_db

JWT_SECRET=replace_this_with_a_long_random_string
```

### 4. Install server dependencies

```bash
# (still inside /server)
npm install
```

### 5. Install client dependencies

```bash
cd ../client
npm install
```

---

## Running the Development Servers

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# → Listening on http://localhost:4000
# → [DB] Schema initialised successfully.
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# → Local: http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## API Reference

### Auth
| Method | Endpoint           | Auth | Description        |
|--------|--------------------|------|--------------------|
| POST   | `/api/auth/register` | —  | Create account     |
| POST   | `/api/auth/login`    | —  | Get JWT token      |
| GET    | `/api/auth/profile`  | ✓  | Full profile + history |

### Auctions
| Method | Endpoint                     | Auth   | Description          |
|--------|------------------------------|--------|----------------------|
| GET    | `/api/auctions`              | —      | List (filter, paginate) |
| GET    | `/api/auctions/categories`   | —      | All categories       |
| GET    | `/api/auctions/:id`          | —      | Detail + bid history |
| POST   | `/api/auctions`              | Seller | Create auction       |

### Bids
| Method | Endpoint                          | Auth   | Description       |
|--------|-----------------------------------|--------|-------------------|
| POST   | `/api/auctions/:id/bids`          | Buyer  | Place a bid       |
| DELETE | `/api/auctions/:id/bids`          | Buyer  | Withdraw top bid  |

---

## Fraud Detection Engine — "Red Alert"

All 5 checks run on every bid placement via the `bidFraudCheck` middleware:

| Check | Trigger | Rep Penalty | Severity |
|-------|---------|-------------|----------|
| **Rapid Bidding** | > 5 bids/60 s from same user on same auction | −20 | Medium |
| **Suspicious Amount** | Bid > 2× current bid | −20 | Low |
| **Shill Bidding** | Buyer shares IP or browser fingerprint with seller | −50 | Critical |
| **Bot Detection** | ≥ 3 identical inter-bid intervals (±150 ms) | −40 | High |
| **Bid Shielding** | Withdrawal attempt in final 2 minutes | −30 | High |

All events are logged to `fraud_events` with a JSON `detail` blob. Reputation deductions are recorded in `reputation_history` (full ledger).

**Account lock:** When `reputation ≤ 0`, `is_locked = 1` — the user cannot place any further bids. The `requireUnlocked` middleware enforces this at the route level.

---

## Reputation System

| Event | Delta |
|-------|-------|
| Account created | +100 (starting balance) |
| Won an auction | +10 |
| Lost auction | ±0 |
| Fraud trigger (varies) | −20 to −50 |
| Reputation reaches 0 | Account locked |

Reputation tiers shown in the Dashboard meter:
- 🟢 **Trusted** — 80–100
- 🟡 **Caution** — 40–79
- 🔴 **Risky** — 1–39
- ⚫ **Locked** — 0

---

## Socket.io Events

| Event (server → client) | Payload | When |
|-------------------------|---------|------|
| `bid_update` | `{ auctionId, newBid, bidder, timestamp, fraudWarnings }` | Successful bid |
| `bid_withdrawn` | `{ auctionId, newBid }` | Bid withdrawal |
| `auction_ended` | `{ auctionId }` | Finaliser closes auction |

**Client → Server:**
- `join_auction` (auctionId) — subscribe to room
- `leave_auction` (auctionId) — unsubscribe

---

## Database Schema Overview

```
users               — accounts, reputation, lock status, IP, fingerprint
categories          — 7 preset categories
auctions            — listings with reserve_price, current_bid, status
bids                — every bid with is_winning flag (only 1 active winner)
fraud_events        — append-only audit log with JSON detail
reputation_history  — full ledger of every rep change
notifications       — win/loss alerts
```

**Views:**
- `v_active_auctions` — live auctions with time remaining
- `v_user_stats` — per-user aggregates (auctions, bids, wins)

Bid placement uses `SELECT ... FOR UPDATE` (row-level lock) inside a transaction to prevent race conditions under concurrent load.

---

## Production Checklist

- [ ] Set a strong `JWT_SECRET` (32+ random characters)
- [ ] Use `DB_PASSWORD` with a non-root MySQL user
- [ ] Enable HTTPS (reverse proxy: nginx or Caddy)
- [ ] Set `CLIENT_URL` to your production domain
- [ ] Run `npm run build` inside `/client` and serve the `dist/` folder
- [ ] Replace the 15-second auction finaliser with a proper job queue (BullMQ / Agenda)
- [ ] Add rate limiting (express-rate-limit) to all public endpoints
- [ ] Implement email notifications on auction win/loss

---

## License

MIT
