-- SQL Function for Atomic Poll ID Generation
-- Run this in your Supabase SQL editor to create the function

-- Function to get next available onchain_id atomically
CREATE OR REPLACE FUNCTION get_next_onchain_id()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_id INTEGER;
BEGIN
  -- Get the maximum onchain_id and add 1
  SELECT COALESCE(MAX(onchain_id), -1) + 1 
  INTO next_id
  FROM dao_polls
  WHERE onchain_id IS NOT NULL;
  
  RETURN next_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_next_onchain_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_onchain_id() TO anon;

-- Optional: Create a sequence for even better atomicity
-- This guarantees unique IDs even under high concurrency
CREATE SEQUENCE IF NOT EXISTS dao_poll_onchain_id_seq START 0;

-- Function using sequence (better for high concurrency)
CREATE OR REPLACE FUNCTION get_next_onchain_id_with_sequence()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_id INTEGER;
BEGIN
  -- Get next value from sequence
  next_id := nextval('dao_poll_onchain_id_seq');
  
  -- Ensure we're ahead of any manually set IDs
  PERFORM setval('dao_poll_onchain_id_seq', 
    GREATEST(next_id, COALESCE((SELECT MAX(onchain_id) FROM dao_polls WHERE onchain_id IS NOT NULL), -1) + 1)
  );
  
  RETURN next_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_next_onchain_id_with_sequence() TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_onchain_id_with_sequence() TO anon;
