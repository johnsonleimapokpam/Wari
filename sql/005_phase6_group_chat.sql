BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'conversation_member_role'
    ) THEN
        CREATE TYPE conversation_member_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'message_receipt_status'
    ) THEN
        CREATE TYPE message_receipt_status AS ENUM ('SENT', 'DELIVERED', 'READ');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'conversation_type'
    ) THEN
        CREATE TYPE conversation_type AS ENUM ('direct', 'group');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'conversation_type'
          AND e.enumlabel = 'group'
    ) THEN
        ALTER TYPE conversation_type ADD VALUE 'group';
    END IF;
END
$$;

ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE conversations
    ALTER COLUMN direct_key DROP NOT NULL;

ALTER TABLE conversation_members
    ADD COLUMN IF NOT EXISTS role conversation_member_role NOT NULL DEFAULT 'MEMBER',
    ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS added_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_type_owner ON conversations (conversation_type, owner_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_deleted_at ON conversations (deleted_at);
CREATE INDEX IF NOT EXISTS idx_conversation_members_role ON conversation_members (conversation_id, role);
CREATE INDEX IF NOT EXISTS idx_conversation_members_active ON conversation_members (conversation_id, user_id, left_at);

CREATE TABLE IF NOT EXISTS message_receipts (
    message_id UUID NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_receipts_user_id ON message_receipts (user_id);
CREATE INDEX IF NOT EXISTS idx_message_receipts_message_id ON message_receipts (message_id);
CREATE INDEX IF NOT EXISTS idx_message_receipts_user_unread ON message_receipts (user_id, read_at) WHERE read_at IS NULL;

COMMIT;