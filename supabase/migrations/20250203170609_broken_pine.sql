/*
  # Remove image_url column

  1. Changes
    - Drop the `image_url` column from the `delivery_points` table
*/

DO $$ 
BEGIN
  -- Check if the column exists before attempting to drop it
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'delivery_points' 
    AND column_name = 'image_url'
  ) THEN
    -- Drop the image_url column
    ALTER TABLE delivery_points 
    DROP COLUMN image_url;
  END IF;
END $$;