-- Staking Events Table
-- Tracks WagdieStaked, WagdieUnstaked, WagdieLocationChanged, WagdieBurned events
-- from WagdieWorld contract: 0x616D4635ceCf94597690Cab0Fc159c3A8231C904

CREATE TABLE IF NOT EXISTS staking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('stake', 'unstake', 'location_change', 'burn')),
  location_id BIGINT,
  old_location_id BIGINT,
  new_location_id BIGINT,
  owner_address TEXT,
  transaction_hash TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  log_index INTEGER NOT NULL DEFAULT 0,
  event_timestamp TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(transaction_hash, log_index)
);

-- Indexes for common queries
CREATE INDEX idx_staking_events_token_id ON staking_events(token_id);
CREATE INDEX idx_staking_events_location_id ON staking_events(location_id);
CREATE INDEX idx_staking_events_event_type ON staking_events(event_type);
CREATE INDEX idx_staking_events_block_number ON staking_events(block_number DESC);
CREATE INDEX idx_staking_events_owner ON staking_events(owner_address);

-- Row Level Security
ALTER TABLE staking_events ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for staking_events"
  ON staking_events
  FOR SELECT
  USING (true);

-- Grants
GRANT SELECT ON staking_events TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON staking_events TO service_role;
