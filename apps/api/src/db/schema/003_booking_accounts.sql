-- Bookings made while signed in belong to that account (booking history, resale). Guest bookings have none.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts (id);
CREATE INDEX IF NOT EXISTS bookings_account ON bookings (account_id);
