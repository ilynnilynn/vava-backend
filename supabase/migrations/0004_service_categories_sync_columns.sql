-- ============================================================
-- MIGRATION 0004 — service_categories: add has_styles + is_standalone
--
-- These columns exist in the Notion source of truth but were not
-- previously synced. Adding them so the sync script can write them.
-- ============================================================

ALTER TABLE service_categories
  ADD COLUMN IF NOT EXISTS has_styles    BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE service_categories
  ADD COLUMN IF NOT EXISTS is_standalone BOOLEAN NOT NULL DEFAULT true;
