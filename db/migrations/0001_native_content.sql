-- Native app content (backend plan, Phase 2). Additive: creates new tables only.
-- Generated from workers/shared/native-content.ts by workers/api/scripts/print-native-ddl.mjs.
-- Apply: npx wrangler d1 execute filter-db --remote --file=db/migrations/0001_native_content.sql

CREATE TABLE IF NOT EXISTS events (
  document_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  event_type TEXT,
  start_date TEXT,
  end_date TEXT,
  location_document_id TEXT,
  host_brand_document_id TEXT,
  physical_location TEXT,
  website TEXT,
  is_free INTEGER,
  ticket_price REAL,
  tickets_available INTEGER,
  image_url TEXT,
  image_width INTEGER,
  image_height INTEGER,
  image_formats TEXT,
  updated_at TEXT,
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(location_document_id, start_date);
CREATE INDEX IF NOT EXISTS idx_events_host_brand ON events(host_brand_document_id);

CREATE TABLE IF NOT EXISTS shop_events (
  shop_document_id TEXT NOT NULL,
  event_document_id TEXT NOT NULL,
  PRIMARY KEY (shop_document_id, event_document_id)
);
CREATE INDEX IF NOT EXISTS idx_shop_events_event ON shop_events(event_document_id);

CREATE TABLE IF NOT EXISTS people (
  document_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  bio TEXT,
  photo_url TEXT,
  photo_width INTEGER,
  photo_height INTEGER,
  photo_formats TEXT,
  roles TEXT,
  affiliation_blurb TEXT,
  affiliated_shop_document_id TEXT,
  website TEXT,
  instagram TEXT,
  twitter TEXT,
  youtube TEXT,
  tiktok TEXT,
  updated_at TEXT,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS person_picks (
  document_id TEXT PRIMARY KEY,
  person_document_id TEXT,
  shop_document_id TEXT,
  rank INTEGER,
  description TEXT,
  updated_at TEXT,
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_person_picks_person ON person_picks(person_document_id);
CREATE INDEX IF NOT EXISTS idx_person_picks_shop ON person_picks(shop_document_id);

CREATE TABLE IF NOT EXISTS news_articles (
  document_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT,
  statement TEXT,
  summary TEXT,
  published_date TEXT,
  news_type TEXT,
  importance TEXT,
  source_name TEXT,
  source_url TEXT,
  source_author TEXT,
  image_url TEXT,
  image_width INTEGER,
  image_height INTEGER,
  image_formats TEXT,
  updated_at TEXT,
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_news_articles_date ON news_articles(published_date);

CREATE TABLE IF NOT EXISTS news_article_locations (
  article_document_id TEXT NOT NULL,
  location_document_id TEXT NOT NULL,
  PRIMARY KEY (article_document_id, location_document_id)
);
CREATE INDEX IF NOT EXISTS idx_news_article_locations_location ON news_article_locations(location_document_id);

CREATE TABLE IF NOT EXISTS news_article_shops (
  article_document_id TEXT NOT NULL,
  shop_document_id TEXT NOT NULL,
  PRIMARY KEY (article_document_id, shop_document_id)
);
CREATE INDEX IF NOT EXISTS idx_news_article_shops_shop ON news_article_shops(shop_document_id);

CREATE TABLE IF NOT EXISTS news_article_brands (
  article_document_id TEXT NOT NULL,
  brand_document_id TEXT NOT NULL,
  PRIMARY KEY (article_document_id, brand_document_id)
);
CREATE INDEX IF NOT EXISTS idx_news_article_brands_brand ON news_article_brands(brand_document_id);

CREATE TABLE IF NOT EXISTS coffee_partners (
  document_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  logo_width INTEGER,
  logo_height INTEGER,
  logo_formats TEXT,
  country_code TEXT,
  primary_category TEXT,
  website TEXT,
  instagram TEXT,
  updated_at TEXT,
  published_at TEXT
);
