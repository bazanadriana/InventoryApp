-- Baseline: register the InventoryRole enum in Prisma history
DO $$
BEGIN
  CREATE TYPE "InventoryRole" AS ENUM ('EDITOR', 'VIEWER');
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END$$;
