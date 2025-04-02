/*
  # Add comment field to delivery points

  1. Changes
    - Add `comment` column to `delivery_points` table
*/

DO $$ 
BEGIN
  -- Add comment column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'delivery_points' 
    AND column_name = 'comment'
  ) THEN
    ALTER TABLE delivery_points 
    ADD COLUMN comment text;
  END IF;
END $$;