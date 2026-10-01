-- Holds, bookings and tickets. Movies, cinemas and showtimes come from the cinema integrations
-- (seed data for now) and are not stored here.

CREATE TABLE IF NOT EXISTS holds (
  id          uuid PRIMARY KEY,
  showtime_id text        NOT NULL,
  client_id   text        NOT NULL,
  seats       text[]      NOT NULL,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS holds_client ON holds (client_id);

-- One row per held seat; the primary key is what stops two customers holding the same seat.
CREATE TABLE IF NOT EXISTS held_seats (
  showtime_id text        NOT NULL,
  seat        text        NOT NULL,
  hold_id     uuid        NOT NULL REFERENCES holds (id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  PRIMARY KEY (showtime_id, seat)
);

CREATE TABLE IF NOT EXISTS bookings (
  id                  uuid PRIMARY KEY,
  reference           text UNIQUE NOT NULL,
  showtime_id         text        NOT NULL,
  movie_id            text        NOT NULL,
  cinema_id           text        NOT NULL,
  starts_at           text        NOT NULL, -- ISO with the cinema's UTC offset, kept as sold
  format              text        NOT NULL,
  ticket_price        integer     NOT NULL,
  holder              jsonb       NOT NULL,
  payment_method      text        NOT NULL,
  price               jsonb       NOT NULL,
  payment_ref         text        NOT NULL,
  cinema_confirmation text        NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- A seat can be sold once per showtime.
CREATE TABLE IF NOT EXISTS tickets (
  id          uuid PRIMARY KEY,
  booking_id  uuid NOT NULL REFERENCES bookings (id),
  showtime_id text NOT NULL,
  seat        text NOT NULL,
  qr          text NOT NULL,
  status      text NOT NULL,
  UNIQUE (showtime_id, seat)
);
