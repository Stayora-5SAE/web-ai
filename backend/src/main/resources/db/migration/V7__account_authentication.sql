CREATE TABLE stayora.account_credentials (
  account_id uuid PRIMARY KEY REFERENCES stayora.accounts(id) ON DELETE CASCADE,
  password_hash varchar(300) NOT NULL
);
CREATE TABLE stayora.account_sessions (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES stayora.accounts(id) ON DELETE CASCADE,
  token_hash varchar(64) NOT NULL UNIQUE,
  csrf_token varchar(64) NOT NULL,
  expires_at timestamp with time zone NOT NULL
);
CREATE INDEX sessions_expiry ON stayora.account_sessions(expires_at);
