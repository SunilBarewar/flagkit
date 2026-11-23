CREATE TYPE "public"."flag_type" AS ENUM('boolean', 'multivariate');--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"type" "flag_type" NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"default_value" boolean DEFAULT false NOT NULL,
	"rollout_percentage" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_project_id_key_unique" UNIQUE("project_id","key"),
	CONSTRAINT "feature_flags_rollout_percentage_range" CHECK ("feature_flags"."rollout_percentage" BETWEEN 0 AND 100)
);
--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;