/*
  # Complete Delivery Points Schema

  1. Schema Changes
    - Drop existing table and related objects
    - Create point_type enum for delivery point types
    - Create delivery_points table with all required fields
    - Add automatic timestamp handling

  2. Security
    - Enable Row Level Security (RLS)
    - Set up public read access
    - Configure authenticated user access
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

-- Create policies with unique names
CREATE POLICY "delivery_points_public_read"
  ON delivery_points
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "delivery_points_auth_all"
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
CREATE TRIGGER delivery_points_set_updated_at
  BEFORE UPDATE ON delivery_points
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();