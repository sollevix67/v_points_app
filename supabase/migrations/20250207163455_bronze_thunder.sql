/*
  # Add search functionality to delivery points

  1. Changes
    - Add a new function `search_delivery_points` that performs a full-text search on:
      - name
      - shop_code
      - address
      - city
      - postal_code
    - The function accepts a search query and returns matching delivery points
    - Results are ordered by relevance

  2. Security
    - Function is accessible to public (read-only)
*/

-- Create the search function
CREATE OR REPLACE FUNCTION search_delivery_points(search_query text)
RETURNS SETOF delivery_points
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM delivery_points
  WHERE
    search_query IS NULL
    OR shop_code ILIKE '%' || search_query || '%'
    OR name ILIKE '%' || search_query || '%'
    OR address ILIKE '%' || search_query || '%'
    OR city ILIKE '%' || search_query || '%'
    OR postal_code ILIKE '%' || search_query || '%'
  ORDER BY
    CASE
      WHEN shop_code ILIKE search_query || '%' THEN 1
      WHEN name ILIKE search_query || '%' THEN 2
      WHEN city ILIKE search_query || '%' THEN 3
      ELSE 4
    END,
    name ASC;
END;
$$;