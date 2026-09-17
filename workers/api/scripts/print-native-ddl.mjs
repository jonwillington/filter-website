// Prints the Phase 2 DDL from workers/shared/native-content.ts.
// Regenerate the migration with:
//   node scripts/print-native-ddl.mjs > ../../db/migrations/0001_native_content.sql
import { build } from 'esbuild';

const result = await build({
  entryPoints: [new URL('../../shared/native-content.ts', import.meta.url).pathname],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
});
const mod = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);

const lines = [
  '-- Native app content (backend plan, Phase 2). Additive: creates new tables only.',
  '-- Generated from workers/shared/native-content.ts by workers/api/scripts/print-native-ddl.mjs.',
  '-- Apply: npx wrangler d1 execute filter-db --remote --file=db/migrations/0001_native_content.sql',
  '',
];
for (const table of mod.NATIVE_TABLES) {
  lines.push(`${mod.ddlFor(table).replace(/\n    /g, '\n  ').replace(/\n\s+\)$/, '\n)')};`);
  for (const index of mod.indexesFor(table)) lines.push(`${index};`);
  lines.push('');
}
process.stdout.write(lines.join('\n'));
