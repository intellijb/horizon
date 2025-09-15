-- Add userId to interview.sessions table
ALTER TABLE interview.sessions ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON interview.sessions(user_id);

-- Add userId to llm.conversations_openai table
ALTER TABLE llm.conversations_openai ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
CREATE INDEX IF NOT EXISTS conversations_openai_user_id_idx ON llm.conversations_openai(user_id);

-- Add userId to llm.conversation_messages_openai table
ALTER TABLE llm.conversation_messages_openai ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
CREATE INDEX IF NOT EXISTS conversation_messages_openai_user_id_idx ON llm.conversation_messages_openai(user_id);

-- Remove default values after migration (run this after updating your application to provide userId)
-- ALTER TABLE interview.sessions ALTER COLUMN user_id DROP DEFAULT;
-- ALTER TABLE llm.conversations_openai ALTER COLUMN user_id DROP DEFAULT;
-- ALTER TABLE llm.conversation_messages_openai ALTER COLUMN user_id DROP DEFAULT;