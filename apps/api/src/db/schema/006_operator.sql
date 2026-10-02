-- Cinema operator portal (BRD 7.5, 9): staff corrections to listings, and a record of every show change
-- with the bookings it affects, so their customers can be found and told.

-- One row per corrected showtime. A NULL column means "as the cinema's listing says"; the listings
-- themselves come from the cinema integrations (seed data for now) and are not stored here.
CREATE TABLE IF NOT EXISTS showtime_overrides (
  showtime_id text PRIMARY KEY,
  cinema_id   text        NOT NULL,
  day         text        NOT NULL, -- the showtime's date in Cairo, YYYY-MM-DD
  price       integer,
  format      text,
  starts_at   text,                 -- ISO with the cinema's UTC offset, on the listed day
  cancelled   boolean     NOT NULL DEFAULT false,
  updated_by  uuid REFERENCES accounts (id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS showtime_overrides_day ON showtime_overrides (day);

-- Every correction, with the show as customers saw it before and after.
CREATE TABLE IF NOT EXISTS showtime_changes (
  id          uuid PRIMARY KEY,
  seq         bigserial,
  showtime_id text        NOT NULL,
  cinema_id   text        NOT NULL,
  kind        text        NOT NULL, -- 'changed' | 'cancelled' | 'reinstated'
  before      jsonb       NOT NULL, -- {startsAt, format, price, cancelled}
  after       jsonb       NOT NULL,
  account_id  uuid REFERENCES accounts (id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS showtime_changes_showtime ON showtime_changes (showtime_id);

-- Bookings whose show changed time or format, was cancelled or was reinstated after they were sold (BRD 9).
-- notified_at stays empty until customer notifications exist (no email provider is chosen yet).
CREATE TABLE IF NOT EXISTS showtime_change_bookings (
  change_id   uuid NOT NULL REFERENCES showtime_changes (id) ON DELETE CASCADE,
  booking_id  uuid NOT NULL REFERENCES bookings (id),
  notified_at timestamptz,
  PRIMARY KEY (change_id, booking_id)
);
CREATE INDEX IF NOT EXISTS showtime_change_bookings_booking ON showtime_change_bookings (booking_id);

-- The portal lists a cinema's bookings by the day of the show.
CREATE INDEX IF NOT EXISTS bookings_cinema_day ON bookings (cinema_id, (left(starts_at, 10)));
