CREATE TABLE stayora.accounts (
  id uuid PRIMARY KEY, name varchar(120) NOT NULL,
  email varchar(180) NOT NULL UNIQUE, role varchar(16) NOT NULL CHECK (role IN ('GUEST','HOST'))
);
CREATE TABLE stayora.properties (
  id uuid PRIMARY KEY, host_id uuid NOT NULL REFERENCES stayora.accounts(id),
  title varchar(180) NOT NULL, destination varchar(120) NOT NULL,
  category varchar(40) NOT NULL, description text NOT NULL,
  image_urls text NOT NULL, amenities text NOT NULL, badge varchar(40) NOT NULL,
  latitude double precision NOT NULL, longitude double precision NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0), bedrooms integer NOT NULL, bathrooms integer NOT NULL,
  nightly_price numeric(12,3) NOT NULL CHECK (nightly_price >= 0),
  cleaning_fee numeric(12,3) NOT NULL CHECK (cleaning_fee >= 0),
  service_fee numeric(12,3) NOT NULL CHECK (service_fee >= 0),
  rating numeric(3,2) NOT NULL, review_count integer NOT NULL,
  status varchar(16) NOT NULL CHECK (status IN ('PUBLISHED','DRAFT'))
);
CREATE TABLE stayora.availability_blocks (
  id uuid PRIMARY KEY, property_id uuid NOT NULL REFERENCES stayora.properties(id),
  start_date date NOT NULL, end_date date NOT NULL, reason varchar(120) NOT NULL,
  CHECK (end_date > start_date)
);
CREATE TABLE stayora.reservations (
  id uuid PRIMARY KEY, property_id uuid NOT NULL REFERENCES stayora.properties(id),
  guest_id uuid NOT NULL REFERENCES stayora.accounts(id),
  check_in date NOT NULL, check_out date NOT NULL, guests integer NOT NULL CHECK (guests > 0),
  nightly_price numeric(12,3) NOT NULL, subtotal numeric(12,3) NOT NULL,
  cleaning_fee numeric(12,3) NOT NULL, service_fee numeric(12,3) NOT NULL, total numeric(12,3) NOT NULL,
  status varchar(16) NOT NULL CHECK (status IN ('PENDING','CONFIRMED','DECLINED')),
  payment_status varchar(24) NOT NULL CHECK (payment_status = 'SIMULATED'),
  created_at timestamp with time zone NOT NULL, CHECK (check_out > check_in)
);
CREATE INDEX reservations_property_dates ON stayora.reservations(property_id, check_in, check_out);
CREATE INDEX properties_host ON stayora.properties(host_id);
CREATE INDEX availability_property_dates ON stayora.availability_blocks(property_id, start_date, end_date);
-- Reserved module-owned tables; write APIs are intentionally left to contributors.
CREATE TABLE stayora.reviews (
  id uuid PRIMARY KEY, property_id uuid NOT NULL REFERENCES stayora.properties(id),
  author_id uuid NOT NULL REFERENCES stayora.accounts(id), rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5), body text NOT NULL
);
CREATE TABLE stayora.messages (
  id uuid PRIMARY KEY, reservation_id uuid NOT NULL REFERENCES stayora.reservations(id),
  sender_id uuid NOT NULL REFERENCES stayora.accounts(id), body text NOT NULL, created_at timestamp with time zone NOT NULL
);
