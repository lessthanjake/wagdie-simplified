-- Add durable on-chain location IDs for map staking sync
-- Created: 2026-05-06
-- Feature: 020-map-staking-fixes

ALTER TABLE locations
ADD COLUMN IF NOT EXISTS chain_location_id TEXT;

UPDATE locations
SET chain_location_id = btrim(metadata->>'chain_location_id')
WHERE chain_location_id IS NULL
  AND metadata ? 'chain_location_id'
  AND btrim(metadata->>'chain_location_id') ~ '^[1-9][0-9]*$';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'locations_chain_location_id_numeric'
      AND conrelid = 'locations'::regclass
  ) THEN
    ALTER TABLE locations
    ADD CONSTRAINT locations_chain_location_id_numeric
    CHECK (
      chain_location_id IS NULL OR chain_location_id ~ '^[1-9][0-9]*$'
    );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_chain_location_id
ON locations(chain_location_id)
WHERE chain_location_id IS NOT NULL;

COMMENT ON COLUMN locations.chain_location_id IS 'On-chain WAGDIE World location ID as a numeric string; distinct from locations.id DB slug/primary key';
