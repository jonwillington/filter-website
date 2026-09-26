-- Attractions for the native apps' 'nearby' lists (2026-09-24). Additive: one new table.
-- Generated from workers/shared/native-content.ts (see workers/api/scripts/print-native-ddl.mjs).
-- Apply: npx wrangler d1 execute filter-db --remote --file=db/migrations/0002_attractions.sql
CREATE TABLE IF NOT EXISTS attractions (
  document_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  local_name TEXT,
  slug TEXT,
  category TEXT,
  prominence INTEGER,
  lat REAL,
  lng REAL,
  outline TEXT,
  location_document_id TEXT,
  city_area_document_id TEXT,
  summary TEXT,
  website TEXT,
  wikidata_id TEXT,
  image_url TEXT,
  image_width INTEGER,
  image_height INTEGER,
  image_formats TEXT,
  updated_at TEXT,
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_attractions_location ON attractions(location_document_id);
