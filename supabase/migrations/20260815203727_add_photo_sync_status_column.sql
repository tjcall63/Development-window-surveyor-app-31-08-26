ALTER TABLE photos ADD COLUMN IF NOT EXISTS sync_status text NOT NULL DEFAULT 'synced';
