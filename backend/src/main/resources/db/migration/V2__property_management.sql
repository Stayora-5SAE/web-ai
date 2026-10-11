ALTER TABLE stayora.properties ADD COLUMN archived boolean NOT NULL DEFAULT false;
CREATE INDEX properties_discovery_price ON stayora.properties (status, nightly_price) WHERE archived = false;
ALTER TABLE stayora.properties ADD CONSTRAINT properties_geo_bounds CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180);
ALTER TABLE stayora.properties ADD CONSTRAINT properties_room_bounds CHECK (bedrooms BETWEEN 0 AND 30 AND bathrooms BETWEEN 1 AND 30 AND capacity BETWEEN 1 AND 20);
CREATE TABLE stayora.wishlist_entries (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES stayora.accounts(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES stayora.properties(id) ON DELETE CASCADE,
  UNIQUE (account_id, property_id)
);
CREATE INDEX wishlist_account ON stayora.wishlist_entries (account_id);
