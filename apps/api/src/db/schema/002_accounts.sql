-- Customer and cinema staff accounts. Booking does not need one (BRD 7.3); resale and the operator portal do.

CREATE TABLE IF NOT EXISTS accounts (
  id            uuid PRIMARY KEY,
  email         text UNIQUE NOT NULL, -- stored lower case
  name          text        NOT NULL,
  mobile        text        NOT NULL,
  password_hash text        NOT NULL,
  role          text        NOT NULL DEFAULT 'customer', -- 'customer' | 'operator'
  cinema_id     text,                                    -- the cinema an operator works for
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Signed-in sessions. Only a hash of the token is stored, so a database leak does not sign anyone in.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  account_id uuid        NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_account ON sessions (account_id);
