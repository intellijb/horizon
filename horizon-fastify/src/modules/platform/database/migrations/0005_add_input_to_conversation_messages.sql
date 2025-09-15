-- Add input column to conversation_messages_openai table
ALTER TABLE llm.conversation_messages_openai
ADD COLUMN IF NOT EXISTS input JSONB;