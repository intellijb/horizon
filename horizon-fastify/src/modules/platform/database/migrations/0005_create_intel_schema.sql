-- Create the intel schema
CREATE SCHEMA IF NOT EXISTS intel;

-- Create status enum
CREATE TYPE intel.status AS ENUM ('active', 'archived', 'deleted');

-- Create conversation_provider enum
CREATE TYPE intel.conversation_provider AS ENUM ('openai');

-- Create intelligence_topics table
CREATE TABLE intel.intelligence_topics (
    id VARCHAR(255) PRIMARY KEY UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index on topics id
CREATE INDEX topics_id_idx ON intel.intelligence_topics(id);

-- Create intelligence_topic_schema table
CREATE TABLE intel.intelligence_topic_schema (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id VARCHAR(255) NOT NULL REFERENCES intel.intelligence_topics(id) ON DELETE CASCADE,
    column_name VARCHAR(255) NOT NULL,
    column_type VARCHAR(100) NOT NULL,
    column_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(topic_id, column_name)
);

-- Create index on schema topic_id
CREATE INDEX schema_topic_id_idx ON intel.intelligence_topic_schema(topic_id);

-- Create intelligence_topic_inputs table
CREATE TABLE intel.intelligence_topic_inputs (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id VARCHAR(255) NOT NULL REFERENCES intel.intelligence_topics(id) ON DELETE CASCADE,
    status intel.status NOT NULL DEFAULT 'active',
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes on inputs
CREATE INDEX inputs_topic_id_idx ON intel.intelligence_topic_inputs(topic_id);
CREATE INDEX inputs_status_idx ON intel.intelligence_topic_inputs(status);

-- Create intelligence_topic_conversations table
CREATE TABLE intel.intelligence_topic_conversations (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id VARCHAR(255) NOT NULL REFERENCES intel.intelligence_topics(id) ON DELETE CASCADE,
    conversation_provider intel.conversation_provider NOT NULL DEFAULT 'openai',
    conversation_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes on conversations
CREATE INDEX conversations_topic_id_idx ON intel.intelligence_topic_conversations(topic_id);
CREATE INDEX conversations_conversation_id_idx ON intel.intelligence_topic_conversations(conversation_id);

-- Create intelligence_topic_notes table
CREATE TABLE intel.intelligence_topic_notes (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id VARCHAR(255) NOT NULL REFERENCES intel.intelligence_topics(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index on notes topic_id
CREATE INDEX notes_topic_id_idx ON intel.intelligence_topic_notes(topic_id);