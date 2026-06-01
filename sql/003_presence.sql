BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'last_seen_at'
          AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'last_seen'
          AND table_schema = 'public'
    ) THEN
        ALTER TABLE users RENAME COLUMN last_seen_at TO last_seen;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'last_seen'
          AND table_schema = 'public'
    ) THEN
        ALTER TABLE users ADD COLUMN last_seen TIMESTAMPTZ;
    END IF;
END
$$;

COMMIT;