-- Create interview schema
CREATE SCHEMA IF NOT EXISTS interview;

-- Create tables in interview schema
CREATE TABLE "interview"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "category_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview"."interviewers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"company" text,
	"role" text,
	"seniority" "seniority",
	"type_coverage" jsonb NOT NULL,
	"topic_ids" jsonb DEFAULT '[]'::jsonb,
	"style" "interview_style",
	"difficulty" integer,
	"knowledge_scope" jsonb,
	"prompt_template_id" text,
	"language" "language" DEFAULT 'ko',
	"timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" text DEFAULT '1.0.0'
);
--> statement-breakpoint
CREATE TABLE "interview"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_ids" jsonb DEFAULT '[]'::jsonb,
	"title" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"target_score" integer DEFAULT 100,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_interaction_at" timestamp with time zone,
	"interviewer_id" uuid NOT NULL,
	"status" "session_status" DEFAULT 'draft' NOT NULL,
	"retry_policy" jsonb,
	"labels" jsonb,
	"notes" text,
	"language" "language" DEFAULT 'ko',
	"difficulty" integer
);
--> statement-breakpoint
CREATE TABLE "interview"."topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"difficulty" integer,
	"tags" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview"."sessions" ADD CONSTRAINT "sessions_interviewer_id_interviewers_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "interview"."interviewers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview"."topics" ADD CONSTRAINT "topics_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "interview"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_type_idx" ON "interview"."categories" USING btree ("type");--> statement-breakpoint
CREATE INDEX "categories_name_idx" ON "interview"."categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "interviewers_company_idx" ON "interview"."interviewers" USING btree ("company");--> statement-breakpoint
CREATE INDEX "interviewers_role_idx" ON "interview"."interviewers" USING btree ("role");--> statement-breakpoint
CREATE INDEX "interviewers_created_at_idx" ON "interview"."interviewers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_interviewer_id_idx" ON "interview"."sessions" USING btree ("interviewer_id");--> statement-breakpoint
CREATE INDEX "sessions_status_idx" ON "interview"."sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sessions_created_at_idx" ON "interview"."sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_updated_at_idx" ON "interview"."sessions" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "topics_category_id_idx" ON "interview"."topics" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "topics_name_idx" ON "interview"."topics" USING btree ("name");--> statement-breakpoint
CREATE INDEX "topics_difficulty_idx" ON "interview"."topics" USING btree ("difficulty");