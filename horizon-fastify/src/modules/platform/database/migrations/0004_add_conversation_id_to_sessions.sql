-- Add conversation_id column to interview.sessions table
ALTER TABLE "interview"."sessions" ADD COLUMN "conversation_id" text;