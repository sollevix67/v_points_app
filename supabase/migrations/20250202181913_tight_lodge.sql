/*
  # Add street view heading field

  1. Changes
    - Add `streetview_heading` column to `delivery_points` table
    - Set default value of 210 degrees for camera orientation
    - Update existing rows to have the default heading value

  2. Notes
    - The heading value represents the camera angle in degrees (0-360)
    - Default value of 210 matches the previous hardcoded value
    - Using IF NOT EXISTS to prevent errors if column already exists
*/

DO $$ 
BEGIN
  -- Check if the column doesn't exist before adding it
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'delivery_points' 
    AND column_name = 'streetview_heading'
  ) THEN
    -- Add the new column with a default value
    ALTER TABLE delivery_points 
    ADD COLUMN streetview_heading integer DEFAULT 210 NOT NULL;

    -- Update any existing rows to have the default value
    UPDATE delivery_points 
    SET streetview_heading = 210 
    WHERE streetview_heading IS NULL;
  END IF;
END $$;