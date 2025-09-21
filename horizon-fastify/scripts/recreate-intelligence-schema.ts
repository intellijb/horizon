import postgres from "postgres"
import * as dotenv from "dotenv"

dotenv.config()

const sql = postgres(process.env.POSTGRES_URI!)

async function recreateIntelligenceSchema() {
  try {
    console.log("Recreating intelligence schema properly...")

    // Drop and recreate the schema
    await sql`DROP SCHEMA IF EXISTS intelligence CASCADE`
    await sql`CREATE SCHEMA intelligence`

    // Create enums in intelligence schema
    await sql`CREATE TYPE intelligence.status AS ENUM ('active', 'archived', 'deleted')`
    await sql`CREATE TYPE intelligence.conversation_provider AS ENUM ('openai')`

    // Create intelligence_topics table
    await sql`
      CREATE TABLE intelligence.intelligence_topics (
        id VARCHAR(255) PRIMARY KEY UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`

    await sql`CREATE INDEX topics_id_idx ON intelligence.intelligence_topics(id)`

    // Create intelligence_topic_schema table
    await sql`
      CREATE TABLE intelligence.intelligence_topic_schema (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id VARCHAR(255) NOT NULL REFERENCES intelligence.intelligence_topics(id) ON DELETE CASCADE,
        column_name VARCHAR(255) NOT NULL,
        column_type VARCHAR(100) NOT NULL,
        column_description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        UNIQUE(topic_id, column_name)
      )`

    await sql`CREATE INDEX schema_topic_id_idx ON intelligence.intelligence_topic_schema(topic_id)`

    // Create intelligence_topic_inputs table with status column
    await sql`
      CREATE TABLE intelligence.intelligence_topic_inputs (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id VARCHAR(255) NOT NULL REFERENCES intelligence.intelligence_topics(id) ON DELETE CASCADE,
        status intelligence.status NOT NULL DEFAULT 'active',
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`

    await sql`CREATE INDEX inputs_topic_id_idx ON intelligence.intelligence_topic_inputs(topic_id)`
    await sql`CREATE INDEX inputs_status_idx ON intelligence.intelligence_topic_inputs(status)`

    // Create intelligence_topic_conversations table
    await sql`
      CREATE TABLE intelligence.intelligence_topic_conversations (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id VARCHAR(255) NOT NULL REFERENCES intelligence.intelligence_topics(id) ON DELETE CASCADE,
        conversation_provider intelligence.conversation_provider NOT NULL DEFAULT 'openai',
        conversation_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`

    await sql`CREATE INDEX conversations_topic_id_idx ON intelligence.intelligence_topic_conversations(topic_id)`
    await sql`CREATE INDEX conversations_conversation_id_idx ON intelligence.intelligence_topic_conversations(conversation_id)`

    // Create intelligence_topic_notes table
    await sql`
      CREATE TABLE intelligence.intelligence_topic_notes (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id VARCHAR(255) NOT NULL REFERENCES intelligence.intelligence_topics(id) ON DELETE CASCADE,
        note TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )`

    await sql`CREATE INDEX notes_topic_id_idx ON intelligence.intelligence_topic_notes(topic_id)`

    console.log("✅ Intelligence schema recreated successfully!")

    // Insert test data
    console.log("Inserting test data...")

    // Insert test topic
    await sql`
      INSERT INTO intelligence.intelligence_topics (id)
      VALUES ('test-123')
      ON CONFLICT (id) DO NOTHING`

    // Insert test schema
    await sql`
      INSERT INTO intelligence.intelligence_topic_schema (topic_id, column_name, column_type, column_description)
      VALUES ('test-123', 'email', 'string', 'User email')
      ON CONFLICT (topic_id, column_name) DO NOTHING`

    // Insert test input
    await sql`
      INSERT INTO intelligence.intelligence_topic_inputs (topic_id, status, data)
      VALUES ('test-123', 'active', ${{ email: 'test@example.com', name: 'Test User' }})
      ON CONFLICT DO NOTHING`

    console.log("✅ Test data inserted!")

    // Verify the structure
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'intelligence'
      ORDER BY table_name`

    console.log("Tables in intelligence schema:", tables.map(t => t.table_name))

    // Check columns in inputs table
    const columns = await sql`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'intelligence'
      AND table_name = 'intelligence_topic_inputs'
      ORDER BY ordinal_position`

    console.log("Columns in intelligence_topic_inputs:", columns.map(c => `${c.column_name} (${c.udt_name})`))

  } catch (error) {
    console.error("❌ Error recreating schema:", error)
    throw error
  } finally {
    await sql.end()
  }
}

recreateIntelligenceSchema().catch(console.error)