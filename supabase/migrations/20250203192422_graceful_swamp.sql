/*
  # Add unique constraint for shop_code

  1. Changes
    - Add unique constraint on shop_code column to prevent duplicates
    - Add error message for duplicate shop codes

  2. Security
    - No changes to RLS policies
*/

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'delivery_points_shop_code_key'
  ) THEN
    ALTER TABLE delivery_points
    ADD CONSTRAINT delivery_points_shop_code_key UNIQUE (shop_code);
  END IF;
END $$;