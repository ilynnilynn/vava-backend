-- Add working hours columns to pros table
-- Default: 10:00–20:00 (most common range for beauty pros in Taiwan)

ALTER TABLE pros
  ADD COLUMN IF NOT EXISTS work_start_hour INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS work_end_hour   INTEGER NOT NULL DEFAULT 20;

-- Enforce valid hour range and start < end
ALTER TABLE pros
  ADD CONSTRAINT chk_work_start_hour CHECK (work_start_hour >= 0 AND work_start_hour <= 23),
  ADD CONSTRAINT chk_work_end_hour   CHECK (work_end_hour >= 1 AND work_end_hour <= 24),
  ADD CONSTRAINT chk_work_hours_order CHECK (work_start_hour < work_end_hour);
