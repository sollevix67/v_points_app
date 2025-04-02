/*
  # Delivery Points Schema Setup

  1. Schema Changes
    - Drop and recreate delivery points table
    - Add point type enumeration
    - Set up automatic timestamps
    - Add all required fields with proper constraints

  2. Security
    - Enable Row Level Security (RLS)
    - Configure public read access
    - Set up authenticated user access permissions
*/

-- Drop existing objects if they exist
DROP TABLE IF EXISTS delivery_points CASCADE;
DROP TYPE IF EXISTS point_type CASCADE;
DROP FUNCTION IF EXISTS update_updated_at CASCADE;

-- Create point_type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'point_type') THEN
    CREATE TYPE point_type AS ENUM ('locker', 'parcel_shop');
  END IF;
END $$;

-- Create delivery points table
CREATE TABLE delivery_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  point_type point_type NOT NULL,
  shop_code text UNIQUE NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  postal_code text NOT NULL,
  city text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  is_active boolean DEFAULT true,
  image_url text,
  opening_timeframe jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE delivery_points ENABLE ROW LEVEL SECURITY;

-- Create policies with descriptive names
CREATE POLICY "delivery_points_allow_public_read_20250202"
  ON delivery_points
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "delivery_points_allow_auth_all_20250202"
  ON delivery_points
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger with unique name
CREATE TRIGGER delivery_points_update_timestamp_20250202
  BEFORE UPDATE ON delivery_points
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();