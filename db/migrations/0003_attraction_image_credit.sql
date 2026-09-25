-- Photo credit for attraction images (Wikimedia Commons attribution), 2026-09-25. Additive: one new column.
-- Apply: npx wrangler d1 execute filter-db --remote --file=db/migrations/0003_attraction_image_credit.sql
ALTER TABLE attractions ADD COLUMN image_credit TEXT;
