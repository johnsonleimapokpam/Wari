BEGIN;

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS client_message_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_conversation_client_message_id
    ON messages (conversation_id, client_message_id)
    WHERE client_message_id IS NOT NULL;

COMMIT;