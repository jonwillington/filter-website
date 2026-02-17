import { NextResponse } from 'next/server';
import { getDB, proxyToProd } from '@/lib/api/d1';
import { d1RowToBrand } from '@/lib/api/d1-queries';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJSON(val: unknown): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return null; }
  }
  return val;
}

/**
 * GET /api/v2/brands — All brands from D1 with nested beans
 */
export async function GET() {
  try {
    const db = await getDB();
    if (!db) return proxyToProd('/api/v2/brands');

    // Batch fetch all data in parallel
    const [brandsResult, beansResult, originsResult, tagsResult] = await Promise.all([
      db.prepare('SELECT * FROM brands ORDER BY name').all(),
      db.prepare('SELECT * FROM beans ORDER BY name').all(),
      db.prepare('SELECT bean_document_id, country_name AS name, country_code AS code FROM bean_origins').all(),
      db.prepare('SELECT bean_document_id, tag_document_id AS documentId, tag_name AS name FROM bean_flavor_tags').all(),
    ]);

    // Index origins and tags by bean document_id
    const originsByBean = new Map<string, unknown[]>();
    for (const o of originsResult.results) {
      const key = o.bean_document_id as string;
      if (!originsByBean.has(key)) originsByBean.set(key, []);
      originsByBean.get(key)!.push({ name: o.name, code: o.code });
    }

    const tagsByBean = new Map<string, unknown[]>();
    for (const t of tagsResult.results) {
      const key = t.bean_document_id as string;
      if (!tagsByBean.has(key)) tagsByBean.set(key, []);
      tagsByBean.get(key)!.push({ documentId: t.documentId, name: t.name });
    }

    // Format beans and group by brand
    const beansByBrand = new Map<string, unknown[]>();
    for (const bean of beansResult.results) {
      const brandDocId = bean.brand_document_id as string;
      if (!brandDocId) continue;
      if (!beansByBrand.has(brandDocId)) beansByBrand.set(brandDocId, []);
      const docId = bean.document_id as string;
      beansByBrand.get(brandDocId)!.push({
        id: bean.id,
        documentId: docId,
        name: bean.name,
        slug: bean.slug,
        type: bean.type,
        roastLevel: bean.roast_level,
        process: bean.process,
        shortDescription: bean.short_description,
        fullDescription: bean.full_description,
        learnMoreUrl: bean.learn_more_url,
        region: bean.region,
        farm: bean.farm,
        producer: bean.producer,
        altitude: bean.altitude,
        cuppingScore: bean.cupping_score,
        blendComponents: bean.blend_components,
        photo: bean.photo_url ? { url: bean.photo_url, formats: parseJSON(bean.photo_formats) } : null,
        citedSources: parseJSON(bean.cited_sources),
        origins: originsByBean.get(docId) || [],
        flavorTags: tagsByBean.get(docId) || [],
      });
    }

    // Transform brands and attach beans
    const brands = brandsResult.results.map(row => {
      const brand = d1RowToBrand(row);
      const docId = row.document_id as string;
      return {
        ...brand,
        beans: beansByBrand.get(docId) || [],
      };
    });

    return NextResponse.json(brands, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('D1 brands query failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}
