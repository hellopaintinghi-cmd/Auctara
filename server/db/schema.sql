CREATE DATABASE IF NOT EXISTS auction_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE auction_db;

SET FOREIGN_KEY_CHECKS = 0;

-- Drop all known tables (new schema + any old legacy tables)
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reputation_history;
DROP TABLE IF EXISTS fraud_events;
DROP TABLE IF EXISTS bids;
DROP TABLE IF EXISTS auctions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
-- Legacy tables from previous schema attempts:
DROP TABLE IF EXISTS fraud_flags;
DROP TABLE IF EXISTS items;

-- Re-enable FK checks before creating tables
SET FOREIGN_KEY_CHECKS = 1;

-- ────────────────────────────────────────────────────────────
--  USERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE users (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  username        VARCHAR(50)   NOT NULL,
  email           VARCHAR(120)  NOT NULL,
  password_hash   VARCHAR(255)  NOT NULL,
  role            ENUM('buyer','seller','both') NOT NULL DEFAULT 'buyer',
  reputation      SMALLINT      NOT NULL DEFAULT 100,
  is_locked       TINYINT       NOT NULL DEFAULT 0,
  ip_address      VARCHAR(45)   NULL,
  fingerprint     VARCHAR(128)  NULL,
  avatar_url      VARCHAR(512)  NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_email        (email),
  UNIQUE KEY uq_username     (username),
  KEY        idx_reputation  (reputation),
  KEY        idx_fingerprint (fingerprint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
--  CATEGORIES
-- ────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id    TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name  VARCHAR(80)      NOT NULL,
  slug  VARCHAR(80)      NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO categories (name, slug) VALUES
  ('Electronics',    'electronics'),
  ('Art & Antiques', 'art-antiques'),
  ('Vehicles',       'vehicles'),
  ('Collectibles',   'collectibles'),
  ('Fashion',        'fashion'),
  ('Real Estate',    'real-estate'),
  ('Other',          'other');

-- ────────────────────────────────────────────────────────────
--  AUCTIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE auctions (
  id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  seller_id       INT UNSIGNED     NOT NULL,
  category_id     TINYINT UNSIGNED NOT NULL DEFAULT 7,
  title           VARCHAR(200)     NOT NULL,
  description     TEXT             NULL,
  image_url       VARCHAR(512)     NULL,
  starting_price  DECIMAL(14,2)    NOT NULL,
  reserve_price   DECIMAL(14,2)    NOT NULL,
  current_bid     DECIMAL(14,2)    NOT NULL DEFAULT 0.00,
  current_winner  INT UNSIGNED     NULL,
  status          ENUM('pending','active','ended','cancelled')
                                   NOT NULL DEFAULT 'pending',
  starts_at       DATETIME         NOT NULL,
  ends_at         DATETIME         NOT NULL,
  created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_seller      (seller_id),
  KEY idx_status_ends (status, ends_at),
  KEY idx_category    (category_id),

  CONSTRAINT fk_auction_seller   FOREIGN KEY (seller_id)
      REFERENCES users(id)      ON DELETE RESTRICT,
  CONSTRAINT fk_auction_winner   FOREIGN KEY (current_winner)
      REFERENCES users(id)      ON DELETE SET NULL,
  CONSTRAINT fk_auction_category FOREIGN KEY (category_id)
      REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
--  BIDS
-- ────────────────────────────────────────────────────────────
CREATE TABLE bids (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  auction_id  INT UNSIGNED  NOT NULL,
  bidder_id   INT UNSIGNED  NOT NULL,
  amount      DECIMAL(14,2) NOT NULL,
  ip_address  VARCHAR(45)   NULL,
  fingerprint VARCHAR(128)  NULL,
  is_winning  TINYINT       NOT NULL DEFAULT 0,
  placed_at   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  KEY idx_auction_placed (auction_id, placed_at),
  KEY idx_bidder         (bidder_id),
  KEY idx_auction_winner (auction_id, is_winning),

  CONSTRAINT fk_bid_auction FOREIGN KEY (auction_id)
      REFERENCES auctions(id) ON DELETE CASCADE,
  CONSTRAINT fk_bid_bidder  FOREIGN KEY (bidder_id)
      REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
--  FRAUD EVENTS  (append-only audit log)
-- ────────────────────────────────────────────────────────────
CREATE TABLE fraud_events (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  auction_id   INT UNSIGNED NULL,
  bid_id       INT UNSIGNED NULL,
  fraud_type   ENUM(
                 'rapid_bidding',
                 'suspicious_amount',
                 'shill_bidding',
                 'bid_shielding',
                 'bot_detected'
               ) NOT NULL,
  severity     ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  rep_deducted SMALLINT     NOT NULL DEFAULT 0,
  detail       JSON         NULL,
  detected_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_user_detected (user_id, detected_at),
  KEY idx_auction       (auction_id),

  CONSTRAINT fk_fraud_user    FOREIGN KEY (user_id)
      REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_fraud_auction FOREIGN KEY (auction_id)
      REFERENCES auctions(id) ON DELETE SET NULL,
  CONSTRAINT fk_fraud_bid     FOREIGN KEY (bid_id)
      REFERENCES bids(id)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
--  REPUTATION HISTORY  (full ledger)
-- ────────────────────────────────────────────────────────────
CREATE TABLE reputation_history (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  delta       SMALLINT     NOT NULL,
  reason      VARCHAR(120) NOT NULL,
  balance     SMALLINT     NOT NULL,
  related_id  INT UNSIGNED NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_user_created (user_id, created_at),

  CONSTRAINT fk_rep_user FOREIGN KEY (user_id)
      REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
--  NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  type        VARCHAR(60)  NOT NULL,
  message     TEXT         NOT NULL,
  is_read     TINYINT      NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_user_read (user_id, is_read),

  CONSTRAINT fk_notif_user FOREIGN KEY (user_id)
      REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
--  VIEWS
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_active_auctions AS
SELECT
  a.*,
  u.username    AS seller_name,
  u.reputation  AS seller_reputation,
  c.name        AS category_name,
  TIMESTAMPDIFF(SECOND, NOW(), a.ends_at) AS seconds_remaining
FROM auctions   a
JOIN users      u ON u.id = a.seller_id
JOIN categories c ON c.id = a.category_id
WHERE a.status = 'active'
  AND a.ends_at > NOW();

CREATE OR REPLACE VIEW v_user_stats AS
SELECT
  u.id,
  u.username,
  u.reputation,
  u.is_locked,
  COUNT(DISTINCT a.id)                                      AS auctions_created,
  COUNT(DISTINCT b.id)                                      AS total_bids,
  COUNT(DISTINCT CASE WHEN b.is_winning = 1 THEN b.id END)  AS auctions_won
FROM users u
LEFT JOIN auctions a ON a.seller_id = u.id
LEFT JOIN bids     b ON b.bidder_id = u.id
GROUP BY u.id, u.username, u.reputation, u.is_locked;

-- ── Sanity check ────────────────────────────────────────────
SELECT 'Schema applied successfully.' AS status;
SHOW TABLES;
