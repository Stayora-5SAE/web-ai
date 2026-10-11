ALTER TABLE stayora.reservations DROP CONSTRAINT reservations_status_check;
ALTER TABLE stayora.reservations ADD CONSTRAINT reservations_status_check CHECK (status IN ('PENDING','CONFIRMED','DECLINED','CANCELLED'));
ALTER TABLE stayora.reservations DROP CONSTRAINT reservations_payment_status_check;
ALTER TABLE stayora.reservations ADD CONSTRAINT reservations_payment_status_check CHECK (payment_status IN ('SIMULATED','SIMULATED_REFUNDED'));
ALTER TABLE stayora.reservations ADD COLUMN cancelled_at timestamp with time zone;
ALTER TABLE stayora.reservations ADD COLUMN cancellation_reason varchar(500);
CREATE INDEX reservations_guest_dates ON stayora.reservations(guest_id, check_in DESC);
CREATE TABLE stayora.reservation_payments (
  id uuid PRIMARY KEY,
  reservation_id uuid NOT NULL UNIQUE REFERENCES stayora.reservations(id) ON DELETE CASCADE,
  amount numeric(12,3) NOT NULL CHECK (amount >= 0),
  currency varchar(3) NOT NULL CHECK (currency = 'TND'),
  mode varchar(16) NOT NULL CHECK (mode = 'SIMULATED'),
  status varchar(16) NOT NULL CHECK (status IN ('CAPTURED','REFUNDED')),
  reference varchar(80) NOT NULL UNIQUE,
  captured_at timestamp with time zone NOT NULL,
  refunded_at timestamp with time zone,
  CHECK ((status = 'CAPTURED' AND refunded_at IS NULL) OR (status = 'REFUNDED' AND refunded_at IS NOT NULL))
);
-- Preserve existing reservation price snapshots; no card details or real transaction is created.
INSERT INTO stayora.reservation_payments
SELECT id, id, total, 'TND', 'SIMULATED', CASE WHEN status='DECLINED' THEN 'REFUNDED' ELSE 'CAPTURED' END,
  'DEMO-' || id::text, created_at, CASE WHEN status='DECLINED' THEN created_at ELSE NULL END
FROM stayora.reservations;
UPDATE stayora.reservations SET payment_status='SIMULATED_REFUNDED' WHERE status='DECLINED';
