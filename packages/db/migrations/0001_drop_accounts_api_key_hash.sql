ALTER TABLE "accounts" DROP CONSTRAINT "accounts_api_key_hash_unique";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "api_key_hash";