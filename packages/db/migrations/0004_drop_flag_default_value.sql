ALTER TABLE "feature_flags" ALTER COLUMN "rollout_percentage" SET DEFAULT 100;--> statement-breakpoint
ALTER TABLE "feature_flags" DROP COLUMN "default_value";