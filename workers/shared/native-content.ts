/**
 * Content mirrored into D1 for the native apps (backend plan, Phase 2).
 *
 * Shared by:
 * - workers/d1-reseed — nightly full load
 * - workers/api       — Strapi webhook (real-time updates)
 *
 * The same DDL lives in db/schema.sql and db/migrations/0001_native_content.sql.
 * Keep all three in step.
 */

// ─── Schema ───────────────────────────────────────────────────────────────────

export const NATIVE_TABLES = [
  'events',
  'shop_events',
  'people',
  'person_picks',
  'news_articles',
  'news_article_locations',
  'news_article_shops',
  'news_article_brands',
  'coffee_partners',
] as const;

export type NativeTable = (typeof NATIVE_TABLES)[number];

/** CREATE TABLE statements, keyed by table. `{t}` is replaced with the physical table name. */
export const NATIVE_TABLE_DDL: Record<NativeTable, string> = {
  events: `CREATE TABLE IF NOT EXISTS {t} (
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
  )`,
  shop_events: `CREATE TABLE IF NOT EXISTS {t} (
    shop_document_id TEXT NOT NULL,
    event_document_id TEXT NOT NULL,
    PRIMARY KEY (shop_document_id, event_document_id)
  )`,
  people: `CREATE TABLE IF NOT EXISTS {t} (
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
  )`,
  person_picks: `CREATE TABLE IF NOT EXISTS {t} (
    document_id TEXT PRIMARY KEY,
    person_document_id TEXT,
    shop_document_id TEXT,
    rank INTEGER,
    description TEXT,
    updated_at TEXT,
    published_at TEXT
  )`,
  news_articles: `CREATE TABLE IF NOT EXISTS {t} (
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
  )`,
  news_article_locations: `CREATE TABLE IF NOT EXISTS {t} (
    article_document_id TEXT NOT NULL,
    location_document_id TEXT NOT NULL,
    PRIMARY KEY (article_document_id, location_document_id)
  )`,
  news_article_shops: `CREATE TABLE IF NOT EXISTS {t} (
    article_document_id TEXT NOT NULL,
    shop_document_id TEXT NOT NULL,
    PRIMARY KEY (article_document_id, shop_document_id)
  )`,
  news_article_brands: `CREATE TABLE IF NOT EXISTS {t} (
    article_document_id TEXT NOT NULL,
    brand_document_id TEXT NOT NULL,
    PRIMARY KEY (article_document_id, brand_document_id)
  )`,
  coffee_partners: `CREATE TABLE IF NOT EXISTS {t} (
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
  )`,
};

/** Index statements, keyed by table. `{t}` is replaced with the physical table name. */
export const NATIVE_TABLE_INDEXES: Record<NativeTable, string[]> = {
  events: [
    'CREATE INDEX IF NOT EXISTS idx_events_location ON {t}(location_document_id, start_date)',
    'CREATE INDEX IF NOT EXISTS idx_events_host_brand ON {t}(host_brand_document_id)',
  ],
  shop_events: ['CREATE INDEX IF NOT EXISTS idx_shop_events_event ON {t}(event_document_id)'],
  people: [],
  person_picks: [
    'CREATE INDEX IF NOT EXISTS idx_person_picks_person ON {t}(person_document_id)',
    'CREATE INDEX IF NOT EXISTS idx_person_picks_shop ON {t}(shop_document_id)',
  ],
  news_articles: ['CREATE INDEX IF NOT EXISTS idx_news_articles_date ON {t}(published_date)'],
  news_article_locations: ['CREATE INDEX IF NOT EXISTS idx_news_article_locations_location ON {t}(location_document_id)'],
  news_article_shops: ['CREATE INDEX IF NOT EXISTS idx_news_article_shops_shop ON {t}(shop_document_id)'],
  news_article_brands: ['CREATE INDEX IF NOT EXISTS idx_news_article_brands_brand ON {t}(brand_document_id)'],
  coffee_partners: [],
};

export function ddlFor(table: NativeTable, physicalName: string = table): string {
  return NATIVE_TABLE_DDL[table].replace('{t}', physicalName);
}

export function indexesFor(table: NativeTable, physicalName: string = table): string[] {
  return NATIVE_TABLE_INDEXES[table].map(sql => sql.replace('{t}', physicalName));
}

// ─── Strapi ───────────────────────────────────────────────────────────────────

/** Strapi models this module owns, keyed by webhook `model` name. */
export const NATIVE_MODELS = {
  event: {
    endpoint: 'events',
    params: {
      'populate[city][fields][0]': 'documentId',
      'populate[eventHostBrand][fields][0]': 'documentId',
      'populate[image]': 'true',
    },
  },
  person: {
    endpoint: 'people',
    params: {
      'populate[photo]': 'true',
      'populate[roles][fields][0]': 'slug',
      'populate[roles][fields][1]': 'name',
      'populate[affiliated_shop][fields][0]': 'documentId',
    },
  },
  'person-pick': {
    endpoint: 'person-picks',
    params: {
      'populate[person][fields][0]': 'documentId',
      'populate[shop][fields][0]': 'documentId',
    },
  },
  'news-article': {
    endpoint: 'news-articles',
    params: {
      'populate[featured_image]': 'true',
      'populate[brands_mentioned][fields][0]': 'documentId',
      'populate[shops_mentioned][fields][0]': 'documentId',
      'populate[locations_mentioned][fields][0]': 'documentId',
    },
  },
  'coffee-partner': {
    endpoint: 'coffee-partners',
    params: {
      'populate[logo]': 'true',
      'populate[country][fields][0]': 'code',
    },
  },
} as const;

export type NativeModel = keyof typeof NATIVE_MODELS;

/** Shop → events links. Shops are owned by the existing sync; only the join table is ours. */
export const SHOP_EVENTS_PARAMS = {
  'fields[0]': 'documentId',
  'populate[events][fields][0]': 'documentId',
} as const;

export function isNativeModel(model: string): model is NativeModel {
  return Object.prototype.hasOwnProperty.call(NATIVE_MODELS, model);
}

// ─── Row statements ───────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

type TableNames = Partial<Record<NativeTable, string>>;

function name(table: NativeTable, names: TableNames): string {
  return names[table] ?? table;
}

function json(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

function boolInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return value ? 1 : 0;
}

function str(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function docIds(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.map((item: any) => item?.documentId).filter((id: unknown): id is string => typeof id === 'string');
}

function upsert(db: D1Database, table: string, row: Record<string, unknown>): D1PreparedStatement {
  const cols = Object.keys(row);
  const placeholders = cols.map((_, i) => `?${i + 1}`);
  return db
    .prepare(`INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${placeholders.join(',')})`)
    .bind(...cols.map(c => row[c] ?? null));
}

/**
 * Statements that write one Strapi entry (and its join rows) into D1.
 * Join rows are cleared first so removed links disappear.
 */
export function upsertStatements(
  db: D1Database,
  model: NativeModel,
  entry: any,
  names: TableNames = {},
  options: { clearJoins?: boolean } = { clearJoins: true },
): D1PreparedStatement[] {
  const id = entry.documentId as string;

  switch (model) {
    case 'event':
      return [
        upsert(db, name('events', names), {
          document_id: id,
          name: str(entry.name) ?? '',
          description: str(entry.description),
          event_type: str(entry.event_type),
          start_date: str(entry.start_date),
          end_date: str(entry.end_date),
          location_document_id: str(entry.city?.documentId),
          host_brand_document_id: str(entry.eventHostBrand?.documentId),
          physical_location: str(entry.physicalLocation),
          website: str(entry.website),
          is_free: boolInt(entry.is_free),
          ticket_price: num(entry.ticket_price),
          tickets_available: boolInt(entry.ticketsAvailable),
          image_url: str(entry.image?.url),
          image_width: num(entry.image?.width),
          image_height: num(entry.image?.height),
          image_formats: json(entry.image?.formats),
          updated_at: str(entry.updatedAt),
          published_at: str(entry.publishedAt),
        }),
      ];

    case 'person':
      return [
        upsert(db, name('people', names), {
          document_id: id,
          name: str(entry.name) ?? '',
          slug: str(entry.slug),
          bio: str(entry.bio),
          photo_url: str(entry.photo?.url),
          photo_width: num(entry.photo?.width),
          photo_height: num(entry.photo?.height),
          photo_formats: json(entry.photo?.formats),
          roles: json((entry.roles ?? []).map((r: any) => r?.slug ?? r?.name).filter(Boolean)),
          affiliation_blurb: str(entry.affiliation_blurb),
          affiliated_shop_document_id: str(entry.affiliated_shop?.documentId),
          website: str(entry.website),
          instagram: str(entry.instagram),
          twitter: str(entry.twitter),
          youtube: str(entry.youtube),
          tiktok: str(entry.tiktok),
          updated_at: str(entry.updatedAt),
          published_at: str(entry.publishedAt),
        }),
      ];

    case 'person-pick':
      return [
        upsert(db, name('person_picks', names), {
          document_id: id,
          person_document_id: str(entry.person?.documentId),
          shop_document_id: str(entry.shop?.documentId),
          rank: num(entry.rank),
          description: str(entry.description),
          updated_at: str(entry.updatedAt),
          published_at: str(entry.publishedAt),
        }),
      ];

    case 'news-article': {
      const statements: D1PreparedStatement[] = [];
      if (options.clearJoins) {
        for (const join of ['news_article_locations', 'news_article_shops', 'news_article_brands'] as const) {
          statements.push(db.prepare(`DELETE FROM ${name(join, names)} WHERE article_document_id = ?1`).bind(id));
        }
      }
      statements.push(
        upsert(db, name('news_articles', names), {
          document_id: id,
          title: str(entry.title) ?? '',
          slug: str(entry.slug),
          statement: str(entry.statement),
          summary: str(entry.summary),
          published_date: str(entry.published_date),
          news_type: str(entry.news_type),
          importance: str(entry.importance),
          source_name: str(entry.source_name),
          source_url: str(entry.source_url),
          source_author: str(entry.source_author),
          image_url: str(entry.featured_image?.url),
          image_width: num(entry.featured_image?.width),
          image_height: num(entry.featured_image?.height),
          image_formats: json(entry.featured_image?.formats),
          updated_at: str(entry.updatedAt),
          published_at: str(entry.publishedAt),
        }),
      );
      for (const locationId of docIds(entry.locations_mentioned)) {
        statements.push(upsert(db, name('news_article_locations', names), { article_document_id: id, location_document_id: locationId }));
      }
      for (const shopId of docIds(entry.shops_mentioned)) {
        statements.push(upsert(db, name('news_article_shops', names), { article_document_id: id, shop_document_id: shopId }));
      }
      for (const brandId of docIds(entry.brands_mentioned)) {
        statements.push(upsert(db, name('news_article_brands', names), { article_document_id: id, brand_document_id: brandId }));
      }
      return statements;
    }

    case 'coffee-partner':
      return [
        upsert(db, name('coffee_partners', names), {
          document_id: id,
          name: str(entry.name) ?? '',
          logo_url: str(entry.logo?.url),
          logo_width: num(entry.logo?.width),
          logo_height: num(entry.logo?.height),
          logo_formats: json(entry.logo?.formats),
          country_code: str(entry.country?.code),
          primary_category: str(entry.primary_category),
          website: str(entry.website),
          instagram: str(entry.instagram),
          updated_at: str(entry.updatedAt),
          published_at: str(entry.publishedAt),
        }),
      ];
  }
}

/** Statements that remove one Strapi entry (and its join rows) from D1. */
export function deleteStatements(db: D1Database, model: NativeModel, documentId: string): D1PreparedStatement[] {
  const del = (table: NativeTable, column: string) =>
    db.prepare(`DELETE FROM ${table} WHERE ${column} = ?1`).bind(documentId);

  switch (model) {
    case 'event':
      return [del('events', 'document_id'), del('shop_events', 'event_document_id')];
    case 'person':
      return [del('people', 'document_id'), del('person_picks', 'person_document_id')];
    case 'person-pick':
      return [del('person_picks', 'document_id')];
    case 'news-article':
      return [
        del('news_articles', 'document_id'),
        del('news_article_locations', 'article_document_id'),
        del('news_article_shops', 'article_document_id'),
        del('news_article_brands', 'article_document_id'),
      ];
    case 'coffee-partner':
      return [del('coffee_partners', 'document_id')];
  }
}

/** Statements that replace one shop's event links. */
export function shopEventStatements(
  db: D1Database,
  shopEntry: any,
  names: TableNames = {},
  options: { clearJoins?: boolean } = { clearJoins: true },
): D1PreparedStatement[] {
  const shopId = shopEntry.documentId as string;
  const table = name('shop_events', names);
  const statements: D1PreparedStatement[] = [];
  if (options.clearJoins) {
    statements.push(db.prepare(`DELETE FROM ${table} WHERE shop_document_id = ?1`).bind(shopId));
  }
  for (const eventId of docIds(shopEntry.events)) {
    statements.push(upsert(db, table, { shop_document_id: shopId, event_document_id: eventId }));
  }
  return statements;
}
