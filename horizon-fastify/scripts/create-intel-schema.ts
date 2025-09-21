import postgres from "postgres"
import * as dotenv from "dotenv"

dotenv.config()

const sql = postgres(process.env.POSTGRES_URI!)

async function createIntelSchema() {
  try {
    console.log("Creating intel schema...")

    // Create the intel schema
    await sql`CREATE SCHEMA IF NOT EXISTS intel`

    // Create enums in intel schema
    await sql`DO $$ BEGIN
      CREATE TYPE intel.status AS ENUM ('active', 'archived', 'deleted');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$`

    await sql`DO $$ BEGIN
      CREATE TYPE intel.conversation_provider AS ENUM ('openai');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$`

    // Create intelligence_topics table
    await sql`
      CREATE TABLE IF NOT EXISTS intel.intelligence_topics (
        id VARCHAR(255) PRIMARY KEY UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS topics_id_idx ON intel.intelligence_topics(id)`

    // Create intelligence_topic_schema table
    await sql`
      CREATE TABLE IF NOT EXISTS intel.intelligence_topic_schema (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id VARCHAR(255) NOT NULL REFERENCES intel.intelligence_topics(id) ON DELETE CASCADE,
        column_name VARCHAR(255) NOT NULL,
        column_type VARCHAR(100) NOT NULL,
        column_description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        UNIQUE(topic_id, column_name)
      )`

    await sql`CREATE INDEX IF NOT EXISTS schema_topic_id_idx ON intel.intelligence_topic_schema(topic_id)`

    // Create intelligence_topic_inputs table
    await sql`
      CREATE TABLE IF NOT EXISTS intel.intelligence_topic_inputs (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id VARCHAR(255) NOT NULL REFERENCES intel.intelligence_topics(id) ON DELETE CASCADE,
        status intel.status NOT NULL DEFAULT 'active',
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`

    await sql`CREATE INDEX IF NOT EXISTS inputs_topic_id_idx ON intel.intelligence_topic_inputs(topic_id)`
    await sql`CREATE INDEX IF NOT EXISTS inputs_status_idx ON intel.intelligence_topic_inputs(status)`

    // Create intelligence_topic_conversations table
    await sql`
      CREATE TABLE IF NOT EXISTS intel.intelligence_topic_conversations (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id VARCHAR(255) NOT NULL REFERENCES intel.intelligence_topics(id) ON DELETE CASCADE,
        conversation_provider intel.conversation_provider NOT NULL DEFAULT 'openai',
        conversation_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`

    await sql`CREATE INDEX IF NOT EXISTS conversations_topic_id_idx ON intel.intelligence_topic_conversations(topic_id)`
    await sql`CREATE INDEX IF NOT EXISTS conversations_conversation_id_idx ON intel.intelligence_topic_conversations(conversation_id)`

    // Create intelligence_topic_notes table
    await sql`
      CREATE TABLE IF NOT EXISTS intel.intelligence_topic_notes (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id VARCHAR(255) NOT NULL REFERENCES intel.intelligence_topics(id) ON DELETE CASCADE,
        note TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`

    await sql`CREATE INDEX IF NOT EXISTS notes_topic_id_idx ON intel.intelligence_topic_notes(topic_id)`

    console.log("✅ Intel schema created successfully!")

    // Verify tables were created
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'intel'
      ORDER BY table_name`

    console.log("Created tables:", tables.map(t => t.table_name))

  } catch (error) {
    console.error("❌ Error creating intel schema:", error)
    throw error
  } finally {
    await sql.end()
  }
}

createIntelSchema().catch(console.error)