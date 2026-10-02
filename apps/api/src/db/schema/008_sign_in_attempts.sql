-- Sign-in attempts per email, so guessing one account's password is limited across every API instance
-- (Accounts.signIn). An attempt is stored before its password is checked and deleted if it succeeds, so the rows
-- are failed attempts (and checks in progress). The email need not belong to an account. Rows older than the
-- 15-minute window are deleted as new attempts arrive.
CREATE TABLE IF NOT EXISTS sign_in_attempts (
  id    uuid PRIMARY KEY,
  email text        NOT NULL, -- lower case, as typed
  at    timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sign_in_attempts_email ON sign_in_attempts (email, at);
CREATE INDEX IF NOT EXISTS sign_in_attempts_at ON sign_in_attempts (at);
