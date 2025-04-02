/*
  # Update opening_timeframe type

  1. Changes
    - Change opening_timeframe column type from jsonb to text
  
  2. Notes
    - This migration preserves existing data by casting to text
    - No data loss will occur
*/

DO $$ 
BEGIN
  -- Check if the column exists and is of type jsonb
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'delivery_points' 
    AND column_name = 'opening_timeframe'
    AND data_type = 'jsonb'
  ) THEN
    -- Alter the column type to text, converting existing JSON data to text
    ALTER TABLE delivery_points 
    ALTER COLUMN opening_timeframe TYPE text USING opening_timeframe::text;
  END IF;
END $$;