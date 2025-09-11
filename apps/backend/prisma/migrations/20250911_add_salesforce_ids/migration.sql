-- Add Salesforce columns on User (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'salesforceAccountId'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "salesforceAccountId" VARCHAR(18);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'salesforceContactId'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "salesforceContactId" VARCHAR(18);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "User_salesforceAccountId_idx"  ON "User" ("salesforceAccountId");
CREATE INDEX IF NOT EXISTS "User_salesforceContactId_idx"  ON "User" ("salesforceContactId");
