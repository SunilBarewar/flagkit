-- Runs after 0008 has copied each flag's rollout into its default rule.

ALTER TABLE "feature_flags" DROP CONSTRAINT "feature_flags_rollout_percentage_range";--> statement-breakpoint
ALTER TABLE "feature_flags" DROP COLUMN "rollout_percentage";