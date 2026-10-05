CREATE TABLE stayora.conversations (
  id uuid PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES stayora.properties(id),
  reservation_id uuid UNIQUE REFERENCES stayora.reservations(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES stayora.accounts(id),
  host_id uuid NOT NULL REFERENCES stayora.accounts(id),
  subject varchar(180) NOT NULL,
  created_at timestamptz NOT NULL,
  guest_read_at timestamptz,
  host_read_at timestamptz,
  CHECK (guest_id <> host_id)
);
CREATE UNIQUE INDEX conversations_property_inquiry ON stayora.conversations(property_id, guest_id, host_id) WHERE reservation_id IS NULL;
CREATE INDEX conversations_guest ON stayora.conversations(guest_id);
CREATE INDEX conversations_host ON stayora.conversations(host_id);
ALTER TABLE stayora.messages ALTER COLUMN reservation_id DROP NOT NULL;
ALTER TABLE stayora.messages DROP CONSTRAINT messages_reservation_id_fkey;
ALTER TABLE stayora.messages ADD CONSTRAINT messages_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES stayora.reservations(id) ON DELETE CASCADE;
ALTER TABLE stayora.messages ADD COLUMN conversation_id uuid REFERENCES stayora.conversations(id) ON DELETE CASCADE;
ALTER TABLE stayora.messages ADD COLUMN edited_at timestamptz;
ALTER TABLE stayora.messages ADD COLUMN recipient_read_at timestamptz;
ALTER TABLE stayora.messages ADD COLUMN deleted boolean NOT NULL DEFAULT false;
INSERT INTO stayora.conversations(id, property_id, reservation_id, guest_id, host_id, subject, created_at)
SELECT gen_random_uuid(), r.property_id, r.id, r.guest_id, p.host_id, 'Reservation conversation', MIN(m.created_at)
FROM stayora.messages m JOIN stayora.reservations r ON r.id=m.reservation_id JOIN stayora.properties p ON p.id=r.property_id
GROUP BY r.property_id,r.id,r.guest_id,p.host_id;
UPDATE stayora.messages m SET conversation_id=c.id FROM stayora.conversations c WHERE c.reservation_id=m.reservation_id;
ALTER TABLE stayora.messages ALTER COLUMN conversation_id SET NOT NULL;
CREATE INDEX messages_conversation_created ON stayora.messages(conversation_id, created_at);
