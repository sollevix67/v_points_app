/*
  # Update delivery point coordinates

  1. Changes
    - Update coordinates for delivery point with ID 3704c231-a6cf-4bd7-8097-55a4c0ade487
      - Set latitude to 48.55496470000001
      - Set longitude to 7.7122069

  2. Notes
    - Uses safe update with ID check to ensure only the specific point is modified
*/

UPDATE delivery_points
SET 
  latitude = 48.55496470000001,
  longitude = 7.7122069
WHERE id = '3704c231-a6cf-4bd7-8097-55a4c0ade487';