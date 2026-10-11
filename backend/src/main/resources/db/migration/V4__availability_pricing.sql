CREATE TABLE stayora.nightly_prices (
  id uuid PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES stayora.properties(id),
  date date NOT NULL,
  nightly_price numeric(12,3) NOT NULL CHECK (nightly_price > 0 AND nightly_price <= 100000),
  UNIQUE (property_id, date)
);
CREATE INDEX nightly_prices_property_dates ON stayora.nightly_prices(property_id, date);
