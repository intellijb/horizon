CREATE SCHEMA "llm";
--> statement-breakpoint
CREATE TABLE "llm"."conversation_messages_openai" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"status" text NOT NULL,
	"model" text NOT NULL,
	"output" jsonb NOT NULL,
	"temperature" integer,
	"usage" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm"."conversations_openai" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "llm"."conversation_messages_openai" ADD CONSTRAINT "conversation_messages_openai_conversation_id_conversations_openai_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "llm"."conversations_openai"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_messages_openai_conversation_id_idx" ON "llm"."conversation_messages_openai" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_messages_openai_created_at_idx" ON "llm"."conversation_messages_openai" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conversation_messages_openai_status_idx" ON "llm"."conversation_messages_openai" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversation_messages_openai_model_idx" ON "llm"."conversation_messages_openai" USING btree ("model");--> statement-breakpoint
CREATE INDEX "conversations_openai_created_at_idx" ON "llm"."conversations_openai" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conversations_openai_status_idx" ON "llm"."conversations_openai" USING btree ("status");