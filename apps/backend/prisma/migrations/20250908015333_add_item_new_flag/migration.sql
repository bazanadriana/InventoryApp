-- Add "new" flag to Item if it doesn't exist yet
ALTER TABLE "Item"
ADD COLUMN IF NOT EXISTS "new" BOOLEAN NOT NULL DEFAULT false;
