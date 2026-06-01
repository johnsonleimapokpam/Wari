BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'message_status'
    ) THEN
        CREATE TYPE message_status AS ENUM ('SENT', 'DELIVERED', 'READ');
    END IF;
END
$$;

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS status message_status NOT NULL DEFAULT 'SENT',
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

UPDATE messages
SET status = COALESCE(status, 'SENT'::message_status)
WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_status_created_at
    ON messages (conversation_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_status_created_at
    ON messages (sender_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_unread_lookup
    ON messages (conversation_id, status, read_at)
    WHERE status <> 'READ';

COMMIT;