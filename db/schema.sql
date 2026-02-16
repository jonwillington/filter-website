-- D1 Edge Database Schema for filter-website
-- Mirrors Strapi data for edge serving

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
  document_id TEXT PRIMARY KEY,
  id INTEGER,
  name TEXT NOT NULL,
  type TEXT,
  role TEXT,
  description TEXT,
  story TEXT,
  statement TEXT,
  founded TEXT,
  founder TEXT,
  hq TEXT,
  price TEXT,
  quality_tier TEXT,

  -- Logo (flattened from MediaAsset)
  logo_url TEXT,
  logo_formats TEXT, -- JSON

  -- Background image
  bg_image_url TEXT,
  bg_image_formats TEXT, -- JSON

  -- Social
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  tiktok TEXT,
  twitter TEXT,
  youtube TEXT,
  phone TEXT,
  whatsapp TEXT,
  line TEXT,

  -- Coffee sourcing
  roast_own_beans INTEGER, -- boolean
  own_roast_desc TEXT,
  own_bean_link TEXT,
  specializes_light INTEGER,
  specializes_medium INTEGER,
  specializes_dark INTEGER,

  -- Amenities (brand defaults)
  has_wifi INTEGER,
  has_food INTEGER,
  has_outdoor_space INTEGER,
  is_pet_friendly INTEGER,
  has_espresso INTEGER,
  has_filter_coffee INTEGER,
  has_v60 INTEGER,
  has_chemex INTEGER,
  has_aeropress INTEGER,
  has_french_press INTEGER,
  has_cold_brew INTEGER,
  has_batch_brew INTEGER,
  has_siphon INTEGER,
  oat_milk INTEGER,
  plant_milk INTEGER,

  -- JSON fields (stored as-is)
  equipment TEXT, -- JSON
  awards TEXT, -- JSON
  research TEXT, -- JSON
  cited_sources TEXT, -- JSON
  observations TEXT, -- JSON

  -- Strapi metadata
  is_dev INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  published_at TEXT
);

-- Brand suppliers (many-to-many self-referencing)
CREATE TABLE IF NOT EXISTS brand_suppliers (
  brand_document_id TEXT NOT NULL,
  supplier_document_id TEXT NOT NULL,
  PRIMARY KEY (brand_document_id, supplier_document_id)
);

-- Brand own roast countries
CREATE TABLE IF NOT EXISTS brand_roast_countries (
  brand_document_id TEXT NOT NULL,
  country_name TEXT,
  country_code TEXT,
  PRIMARY KEY (brand_document_id, country_code)
);

-- Shops table
CREATE TABLE IF NOT EXISTS shops (
  document_id TEXT PRIMARY KEY,
  id INTEGER,
  name TEXT NOT NULL,
  pref_name TEXT,
  slug TEXT,
  description TEXT,
  address TEXT,
  postal_code TEXT,
  neighbourhood TEXT,

  -- Coordinates
  lat REAL,
  lng REAL,

  -- Foreign keys
  brand_document_id TEXT,
  location_document_id TEXT,
  city_area_document_id TEXT,
  country_code TEXT,

  -- Denormalized brand fields for summary queries (avoid joins)
  brand_name TEXT,
  brand_type TEXT,
  brand_logo_url TEXT,
  brand_statement TEXT,

  -- Denormalized location fields
  location_name TEXT,
  location_slug TEXT,
  city_area_name TEXT,
  city_area_group TEXT,

  -- Featured image
  featured_image_url TEXT,
  featured_image_formats TEXT, -- JSON

  -- Gallery & menus
  gallery TEXT, -- JSON array
  menus TEXT, -- JSON array

  -- Amenities
  has_wifi INTEGER,
  has_food INTEGER,
  has_outdoor_space INTEGER,
  is_pet_friendly INTEGER,
  has_v60 INTEGER,
  has_chemex INTEGER,
  has_filter_coffee INTEGER,
  has_slow_bar INTEGER,
  has_kitchen INTEGER,
  has_espresso INTEGER,
  has_aeropress INTEGER,
  has_french_press INTEGER,
  has_cold_brew INTEGER,
  has_batch_brew INTEGER,

  -- Chain/Independent
  is_chain INTEGER,
  independent INTEGER,

  -- Recommendations
  city_area_rec INTEGER,
  city_area_rec_exp TEXT,
  working_rec INTEGER,
  interior_rec INTEGER,
  brewing_rec INTEGER,
  shop_promo TEXT,
  shop_promo_code TEXT,

  -- Ratings
  google_rating REAL,
  google_review_count INTEGER,
  rating REAL,
  rating_count INTEGER,

  -- Google Places
  google_place_id TEXT,
  google_place_verified INTEGER,
  google_place_last_sync TEXT,
  google_place_match_confidence REAL,
  google_business_status TEXT,
  google_photo_reference TEXT,
  google_formatted_address TEXT,
  google_plus_code TEXT,
  google_types TEXT, -- JSON array
  google_places_last_updated TEXT,
  google_coordinates_last_updated TEXT,

  -- Contact
  website TEXT,
  phone TEXT,
  phone_number TEXT,
  instagram TEXT,
  facebook TEXT,
  tiktok TEXT,

  -- Tags
  public_tags TEXT, -- JSON array
  amenities TEXT, -- JSON array

  -- Other
  architects TEXT,
  price TEXT,
  quality_tier TEXT,
  opening_hours TEXT, -- JSON
  is_open INTEGER,

  -- Pre-calculated
  local_density INTEGER DEFAULT 0,

  -- JSON fields
  research TEXT, -- JSON
  cited_sources TEXT, -- JSON
  observations TEXT, -- JSON
  vision_data TEXT, -- JSON
  preference_profile TEXT, -- JSON

  -- Coffee partner (flattened)
  coffee_partner_document_id TEXT,
  coffee_partner_name TEXT,
  coffee_partner_logo_url TEXT,

  -- Strapi metadata
  is_dev INTEGER DEFAULT 0,
  awards TEXT, -- JSON
  source_articles TEXT, -- JSON
  created_at TEXT,
  updated_at TEXT,
  published_at TEXT
);

-- Spatial index on coordinates for viewport-based loading
CREATE INDEX IF NOT EXISTS idx_shops_coords ON shops(lat, lng);
CREATE INDEX IF NOT EXISTS idx_shops_brand ON shops(brand_document_id);
CREATE INDEX IF NOT EXISTS idx_shops_country ON shops(country_code);
CREATE INDEX IF NOT EXISTS idx_shops_location ON shops(location_document_id);
CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);

-- Beans table
CREATE TABLE IF NOT EXISTS beans (
  document_id TEXT PRIMARY KEY,
  id INTEGER,
  name TEXT NOT NULL,
  slug TEXT,
  type TEXT, -- 'single-origin' | 'blend'
  roast_level TEXT,
  process TEXT,
  short_description TEXT,
  full_description TEXT,
  learn_more_url TEXT,
  region TEXT,
  farm TEXT,
  producer TEXT,
  altitude TEXT,
  cupping_score REAL,
  blend_components TEXT,

  -- Photo
  photo_url TEXT,
  photo_formats TEXT, -- JSON

  -- Foreign key
  brand_document_id TEXT,

  -- JSON fields
  cited_sources TEXT, -- JSON

  -- Strapi metadata
  created_at TEXT,
  updated_at TEXT,
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_beans_brand ON beans(brand_document_id);

-- Bean origins (many-to-many: beans <-> countries)
CREATE TABLE IF NOT EXISTS bean_origins (
  bean_document_id TEXT NOT NULL,
  country_name TEXT,
  country_code TEXT,
  PRIMARY KEY (bean_document_id, country_code)
);

-- Bean flavor tags (many-to-many)
CREATE TABLE IF NOT EXISTS bean_flavor_tags (
  bean_document_id TEXT NOT NULL,
  tag_document_id TEXT,
  tag_name TEXT NOT NULL,
  PRIMARY KEY (bean_document_id, tag_name)
);
