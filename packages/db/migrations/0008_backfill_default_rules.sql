-- Every flag gets a default rule: no conditions, carrying the flag's current rollout.
-- A multivariate flag used to serve its variants to everyone, so its rule is 100%.
INSERT INTO "targeting_rules" ("id", "flag_id", "priority", "enabled", "rollout_percentage")
SELECT
	gen_random_uuid(),
	"id",
	1,
	true,
	CASE WHEN "type" = 'multivariate' THEN 100 ELSE "rollout_percentage" END
FROM "feature_flags"
WHERE NOT EXISTS (
	SELECT 1 FROM "targeting_rules" WHERE "targeting_rules"."flag_id" = "feature_flags"."id"
);
