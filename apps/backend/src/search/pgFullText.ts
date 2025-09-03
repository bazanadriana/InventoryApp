import { prisma } from '../db/prisma';

/** Call once on server startup. Safe to call multiple times. */
export async function initFTS() {
  // Inventories: add column, index, trigger
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='Inventory' AND column_name='search'
      ) THEN
        ALTER TABLE "Inventory" ADD COLUMN search tsvector;
      END IF;
    END$$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS inventory_search_idx
    ON "Inventory" USING GIN (search);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION inventory_search_trigger() RETURNS trigger AS $$
    begin
      new.search :=
        setweight(to_tsvector('simple', coalesce(new.title,'')), 'A') ||
        setweight(to_tsvector('simple', coalesce(new.description,'')), 'B');
      return new;
    end $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'inventory_search_update'
      ) THEN
        CREATE TRIGGER inventory_search_update
        BEFORE INSERT OR UPDATE ON "Inventory"
        FOR EACH ROW EXECUTE PROCEDURE inventory_search_trigger();
      END IF;
    END$$;
  `);

  // Items
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='Item' AND column_name='search'
      ) THEN
        ALTER TABLE "Item" ADD COLUMN search tsvector;
      END IF;
    END$$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS item_search_idx
    ON "Item" USING GIN (search);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION item_search_trigger() RETURNS trigger AS $$
    begin
      new.search :=
        setweight(to_tsvector('simple', coalesce(new.customId,'')), 'A');
      return new;
    end $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'item_search_update'
      ) THEN
        CREATE TRIGGER item_search_update
        BEFORE INSERT OR UPDATE ON "Item"
        FOR EACH ROW EXECUTE PROCEDURE item_search_trigger();
      END IF;
    END$$;
  `);
}