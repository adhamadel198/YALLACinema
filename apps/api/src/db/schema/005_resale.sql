-- Ticket resale (BRD 11): sellers' payout details, listings, the tickets in them, and sales.

-- A buyer's replacement ticket takes the seat of the ticket it replaces, so a seat is unique only among
-- tickets still in use; a transferred (invalidated) ticket no longer holds it. Replaces the
-- UNIQUE (showtime_id, seat) from 001_bookings.sql.
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_showtime_id_seat_key;
CREATE UNIQUE INDEX IF NOT EXISTS tickets_seat_in_use ON tickets (showtime_id, seat) WHERE status <> 'transferred';

-- One payout method per seller. No verification provider is chosen yet, so details are stored as
-- 'unverified-sandbox' and accepted; real payouts must wait for verification.
CREATE TABLE IF NOT EXISTS payout_methods (
  account_id   uuid PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
  kind         text        NOT NULL, -- 'wallet' | 'bank'
  details      jsonb       NOT NULL, -- wallet: {mobile}; bank: {bankName, accountName, accountNumber}
  verification text        NOT NULL, -- 'unverified-sandbox' | 'verified'
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resale_listings (
  id                uuid PRIMARY KEY,
  seller_account_id uuid        NOT NULL REFERENCES accounts (id),
  booking_id        uuid        NOT NULL REFERENCES bookings (id),
  showtime_id       text        NOT NULL,
  starts_at         timestamptz NOT NULL, -- the listing closes when the show starts
  price             integer     NOT NULL, -- per ticket; at most what the seller paid, excluding fees
  status            text        NOT NULL, -- 'open' | 'sold' | 'withdrawn' | 'expired' | 'closed'
  created_at        timestamptz NOT NULL DEFAULT now(),
  closed_at         timestamptz
);
CREATE INDEX IF NOT EXISTS resale_listings_open ON resale_listings (starts_at) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS resale_listings_seller ON resale_listings (seller_account_id);

-- A purchase of some tickets from one listing. 'reserved' while the buyer pays and the cinema transfers;
-- 'abandoned' when it never finished (e.g. the server stopped mid-purchase) and the tickets went back on sale.
CREATE TABLE IF NOT EXISTS resale_sales (
  id               uuid PRIMARY KEY,
  listing_id       uuid        NOT NULL REFERENCES resale_listings (id),
  buyer_account_id uuid        NOT NULL REFERENCES accounts (id),
  ticket_ids       uuid[]      NOT NULL,
  reference        text        NOT NULL, -- sent to the payment provider and the cinema; the buyer's booking reference
  buyer_total      integer     NOT NULL, -- (price + 5 EGP platform fee) per ticket
  seller_payout    integer     NOT NULL, -- max(0, price - 20 EGP resale fee) per ticket, owed only once completed
  status           text        NOT NULL, -- 'reserved' | 'completed' | 'payment-failed' | 'refunded' | 'abandoned'
  payout_status    text,                 -- 'pending' once completed; nothing is paid out for real yet
  payment_ref      text,
  booking_id       uuid REFERENCES bookings (id), -- the buyer's booking holding the replacement tickets
  failure          text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS resale_sales_listing ON resale_sales (listing_id);
CREATE INDEX IF NOT EXISTS resale_sales_in_progress ON resale_sales (updated_at) WHERE status = 'reserved';

CREATE TABLE IF NOT EXISTS resale_listing_tickets (
  listing_id            uuid NOT NULL REFERENCES resale_listings (id),
  ticket_id             uuid NOT NULL REFERENCES tickets (id),
  seat                  text NOT NULL,
  state                 text NOT NULL, -- 'listed' | 'reserved' | 'sold' | 'withdrawn' | 'expired' | 'returned'
  sale_id               uuid REFERENCES resale_sales (id),
  replacement_ticket_id uuid REFERENCES tickets (id),
  PRIMARY KEY (listing_id, ticket_id)
);
-- A ticket is on sale in at most one listing at a time.
CREATE UNIQUE INDEX IF NOT EXISTS resale_ticket_on_sale ON resale_listing_tickets (ticket_id) WHERE state IN ('listed', 'reserved');
-- Unsold tickets from listings that closed at showtime, waiting for the cinema to reactivate them.
CREATE INDEX IF NOT EXISTS tickets_pending_reactivation ON tickets (showtime_id) WHERE status = 'pending-reactivation';
