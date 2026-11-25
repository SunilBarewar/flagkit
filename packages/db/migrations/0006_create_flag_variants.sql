CREATE TABLE "flag_variants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"flag_id" uuid NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"payload" jsonb,
	"rollout_percentage" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flag_variants_flag_id_key_unique" UNIQUE("flag_id","key"),
	CONSTRAINT "flag_variants_rollout_percentage_range" CHECK ("flag_variants"."rollout_percentage" BETWEEN 0 AND 100)
);
--> statement-breakpoint
ALTER TABLE "flag_variants" ADD CONSTRAINT "flag_variants_flag_id_feature_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."feature_flags"("id") ON DELETE cascade ON UPDATE no action;