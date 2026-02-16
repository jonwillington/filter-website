import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext();
  return (env as Record<string, unknown>).DB as D1Database;
}
