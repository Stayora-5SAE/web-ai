ALTER TABLE stayora.reviews ADD COLUMN reservation_id uuid REFERENCES stayora.reservations(id);
ALTER TABLE stayora.reviews ADD COLUMN created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE stayora.reviews ADD COLUMN updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX reviews_one_per_reservation ON stayora.reviews(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE INDEX reviews_property_created ON stayora.reviews(property_id, created_at DESC);
CREATE INDEX reviews_author ON stayora.reviews(author_id);
-- Historical reviews without a reservation remain readable; new writes require a verified stay.
