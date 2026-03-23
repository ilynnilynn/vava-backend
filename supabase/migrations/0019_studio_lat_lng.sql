-- Add lat/lng columns to pros for distance-based search
ALTER TABLE pros
  ADD COLUMN studio_lat DOUBLE PRECISION,
  ADD COLUMN studio_lng DOUBLE PRECISION;
