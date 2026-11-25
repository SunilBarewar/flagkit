CREATE TYPE "public"."condition_operator" AS ENUM('equals', 'not_equals', 'in', 'not_in', 'greater_than', 'less_than', 'contains');--> statement-breakpoint
CREATE TABLE "rule_conditions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"rule_id" uuid NOT NULL,
	"attribute" text NOT NULL,
	"operator" "condition_operator" NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "targeting_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"flag_id" uuid NOT NULL,
	"priority" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"rollout_percentage" integer DEFAULT 0 NOT NULL,
	"variant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "targeting_rules_flag_id_priority_unique" UNIQUE("flag_id","priority"),
	CONSTRAINT "targeting_rules_rollout_percentage_range" CHECK ("targeting_rules"."rollout_percentage" BETWEEN 0 AND 100)
);
--> statement-breakpoint
ALTER TABLE "rule_conditions" ADD CONSTRAINT "rule_conditions_rule_id_targeting_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."targeting_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targeting_rules" ADD CONSTRAINT "targeting_rules_flag_id_feature_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targeting_rules" ADD CONSTRAINT "targeting_rules_variant_id_flag_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."flag_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rule_conditions_rule_id_idx" ON "rule_conditions" USING btree ("rule_id");