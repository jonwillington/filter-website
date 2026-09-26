import {
  NATIVE_MODELS,
  SHOP_EVENTS_PARAMS,
  deleteStatements,
  isNativeModel,
  shopEventStatements,
  upsertStatements,
} from '../../shared/native-content';
import type { Env } from './index';

/**
 * POST /webhooks/strapi
 *
 * Keeps the Phase 2 tables (events, people, picks, news, coffee partners, shop↔event links)
 * in step with Strapi. Shops, brands, beans, locations, countries and city areas stay with
 * the website's /api/v2/webhook; Strapi sends every event to both URLs.
 *
 * Create/update/publish re-fetch the published entry. If Strapi no longer serves it
 * (draft-only or deleted), the row is removed.
 */
export async function handleStrapiWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.WEBHOOK_SECRET || !timingSafeEqual(request.headers.get('x-webhook-secret') ?? '', env.WEBHOOK_SECRET)) {
    return Response.json({ error: { code: 'unauthorized', message: 'Invalid webhook secret' } }, { status: 401 });
  }

  let payload: { event?: string; model?: string; uid?: string; entry?: { documentId?: string } };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: { code: 'bad_request', message: 'Body must be JSON' } }, { status: 400 });
  }

  const model = normaliseModel(payload.model ?? payload.uid ?? '');
  const documentId = payload.entry?.documentId;
  const eventName = payload.event ?? '';

  if (!documentId) return Response.json({ ok: true, ignored: 'no documentId' });

  const removed = eventName === 'entry.delete' || eventName === 'entry.unpublish';

  if (model === 'shop') {
    const entry = removed ? null : await fetchEntry(env, 'shops', documentId, SHOP_EVENTS_PARAMS);
    const statements = entry
      ? shopEventStatements(env.DB, entry)
      : [env.DB.prepare('DELETE FROM shop_events WHERE shop_document_id = ?1').bind(documentId)];
    await env.DB.batch(statements);
    return Response.json({ ok: true, model, documentId, action: entry ? 'shop_events_replaced' : 'shop_events_removed' });
  }

  if (!isNativeModel(model)) return Response.json({ ok: true, ignored: model || 'unknown model' });

  const config = NATIVE_MODELS[model];
  const entry = removed ? null : await fetchEntry(env, config.endpoint, documentId, config.params);

  if (entry) {
    await env.DB.batch(upsertStatements(env.DB, model, entry));
    return Response.json({ ok: true, model, documentId, action: 'upserted' });
  }

  await env.DB.batch(deleteStatements(env.DB, model, documentId));
  return Response.json({ ok: true, model, documentId, action: 'removed' });
}

/** "api::person-pick.person-pick", "person_pick", "personPick" → "person-pick" */
function normaliseModel(raw: string): string {
  const name = raw.includes('.') ? raw.slice(raw.lastIndexOf('.') + 1) : raw;
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchEntry(env: Env, endpoint: string, documentId: string, params: Record<string, string>): Promise<any | null> {
  const url = new URL(`${env.STRAPI_URL}/${endpoint}/${encodeURIComponent(documentId)}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, { headers: { Authorization: `Bearer ${env.STRAPI_TOKEN}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Strapi ${endpoint}/${documentId}: ${res.status}`);
  const json = (await res.json()) as { data?: any };
  return json.data ?? null;
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
