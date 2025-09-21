import postgres from "postgres"
import * as dotenv from "dotenv"

dotenv.config()

const sql = postgres(process.env.POSTGRES_URI!)

async function migrateIntelToIntelligence() {
  try {
    console.log("Starting migration from intel to intelligence schema...")

    // Check if intel schema exists
    const schemas = await sql`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name IN ('intel', 'intelligence')`

    const hasIntel = schemas.some(s => s.schema_name === 'intel')
    const hasIntelligence = schemas.some(s => s.schema_name === 'intelligence')

    if (!hasIntel && hasIntelligence) {
      console.log("Already using intelligence schema, no migration needed")
      await sql.end()
      return
    }

    if (!hasIntel) {
      console.log("No intel schema found, creating intelligence schema fresh...")

      // Create intelligence schema
      await sql`CREATE SCHEMA IF NOT EXISTS intelligence`

      // Create enums in intelligence schema
      await sql`DO $$ BEGIN
        CREATE TYPE intelligence.status AS ENUM ('active', 'archived', 'deleted');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$`

      await sql`DO $$ BEGIN
        CREATE TYPE intelligence.conversation_provider AS ENUM ('openai');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$`

      // Create intelligence_topics table
      await sql`
        CREATE TABLE IF NOT EXISTS intelligence.intelligence_topics (
          id VARCHAR(255) PRIMARY KEY UNIQUE,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        )`

      await sql`CREATE INDEX IF NOT EXISTS topics_id_idx ON intelligence.intelligence_topics(id)`

      // Create intelligence_topic_schema table
      await sql`
        CREATE TABLE IF NOT EXISTS intelligence.intelligence_topic_schema (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
          topic_id VARCHAR(255) NOT NULL REFERENCES intelligence.intelligence_topics(id) ON DELETE CASCADE,
          column_name VARCHAR(255) NOT NULL,
          column_type VARCHAR(100) NOT NULL,
          column_description TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          UNIQUE(topic_id, column_name)
        )`

      await sql`CREATE INDEX IF NOT EXISTS schema_topic_id_idx ON intelligence.intelligence_topic_schema(topic_id)`

      // Create intelligence_topic_inputs table
      await sql`
        CREATE TABLE IF NOT EXISTS intelligence.intelligence_topic_inputs (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
          topic_id VARCHAR(255) NOT NULL REFERENCES intelligence.intelligence_topics(id) ON DELETE CASCADE,
          status intelligence.status NOT NULL DEFAULT 'active',
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        )`

      await sql`CREATE INDEX IF NOT EXISTS inputs_topic_id_idx ON intelligence.intelligence_topic_inputs(topic_id)`
      await sql`CREATE INDEX IF NOT EXISTS inputs_status_idx ON intelligence.intelligence_topic_inputs(status)`

      // Create intelligence_topic_conversations table
      await sql`
        CREATE TABLE IF NOT EXISTS intelligence.intelligence_topic_conversations (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
          topic_id VARCHAR(255) NOT NULL REFERENCES intelligence.intelligence_topics(id) ON DELETE CASCADE,
          conversation_provider intelligence.conversation_provider NOT NULL DEFAULT 'openai',
          conversation_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        )`

      await sql`CREATE INDEX IF NOT EXISTS conversations_topic_id_idx ON intelligence.intelligence_topic_conversations(topic_id)`
      await sql`CREATE INDEX IF NOT EXISTS conversations_conversation_id_idx ON intelligence.intelligence_topic_conversations(conversation_id)`

      // Create intelligence_topic_notes table
      await sql`
        CREATE TABLE IF NOT EXISTS intelligence.intelligence_topic_notes (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
          topic_id VARCHAR(255) NOT NULL REFERENCES intelligence.intelligence_topics(id) ON DELETE CASCADE,
          note TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        )`

      await sql`CREATE INDEX IF NOT EXISTS notes_topic_id_idx ON intelligence.intelligence_topic_notes(topic_id)`

      console.log("✅ Intelligence schema created successfully!")
    } else {
      // Migrate from intel to intelligence
      console.log("Migrating from intel to intelligence schema...")

      // Create intelligence schema
      await sql`CREATE SCHEMA IF NOT EXISTS intelligence`

      // Check if we have data in intel schema
      const hasData = await sql`
        SELECT EXISTS (
          SELECT 1 FROM intel.intelligence_topics LIMIT 1
        ) as has_data`

      if (hasData[0].has_data) {
        console.log("Migrating existing data...")

        // Begin transaction
        await sql.begin(async sql => {
          // Create types in intelligence schema
          await sql`CREATE TYPE intelligence.status AS ENUM ('active', 'archived', 'deleted')`
          await sql`CREATE TYPE intelligence.conversation_provider AS ENUM ('openai')`

          // Create tables with same structure in intelligence schema
          await sql`
            CREATE TABLE intelligence.intelligence_topics AS
            SELECT * FROM intel.intelligence_topics`

          await sql`
            ALTER TABLE intelligence.intelligence_topics
            ADD PRIMARY KEY (id)`

          await sql`
            CREATE TABLE intelligence.intelligence_topic_schema AS
            SELECT * FROM intel.intelligence_topic_schema`

          await sql`
            ALTER TABLE intelligence.intelligence_topic_schema
            ADD PRIMARY KEY (id)`

          await sql`
            CREATE TABLE intelligence.intelligence_topic_inputs AS
            SELECT * FROM intel.intelligence_topic_inputs`

          await sql`
            ALTER TABLE intelligence.intelligence_topic_inputs
            ADD PRIMARY KEY (id)`

          await sql`
            CREATE TABLE intelligence.intelligence_topic_conversations AS
            SELECT * FROM intel.intelligence_topic_conversations`

          await sql`
            ALTER TABLE intelligence.intelligence_topic_conversations
            ADD PRIMARY KEY (id)`

          await sql`
            CREATE TABLE intelligence.intelligence_topic_notes AS
            SELECT * FROM intel.intelligence_topic_notes`

          await sql`
            ALTER TABLE intelligence.intelligence_topic_notes
            ADD PRIMARY KEY (id)`

          // Add foreign keys
          await sql`
            ALTER TABLE intelligence.intelligence_topic_schema
            ADD CONSTRAINT fk_schema_topic
            FOREIGN KEY (topic_id) REFERENCES intelligence.intelligence_topics(id) ON DELETE CASCADE`

          await sql`
            ALTER TABLE intelligence.intelligence_topic_inputs
            ADD CONSTRAINT fk_inputs_topic
            FOREIGN KEY (topic_id) REFERENCES intelligence.intelligence_topics(id) ON DELETE CASCADE`

          await sql`
            ALTER TABLE intelligence.intelligence_topic_conversations
            ADD CONSTRAINT fk_conversations_topic
            FOREIGN KEY (topic_id) REFERENCES intelligence.intelligence_topics(id) ON DELETE CASCADE`

          await sql`
            ALTER TABLE intelligence.intelligence_topic_notes
            ADD CONSTRAINT fk_notes_topic
            FOREIGN KEY (topic_id) REFERENCES intelligence.intelligence_topics(id) ON DELETE CASCADE`

          // Create indexes
          await sql`CREATE INDEX topics_id_idx ON intelligence.intelligence_topics(id)`
          await sql`CREATE INDEX schema_topic_id_idx ON intelligence.intelligence_topic_schema(topic_id)`
          await sql`CREATE INDEX inputs_topic_id_idx ON intelligence.intelligence_topic_inputs(topic_id)`
          await sql`CREATE INDEX inputs_status_idx ON intelligence.intelligence_topic_inputs(status)`
          await sql`CREATE INDEX conversations_topic_id_idx ON intelligence.intelligence_topic_conversations(topic_id)`
          await sql`CREATE INDEX conversations_conversation_id_idx ON intelligence.intelligence_topic_conversations(conversation_id)`
          await sql`CREATE INDEX notes_topic_id_idx ON intelligence.intelligence_topic_notes(topic_id)`

          console.log("✅ Data migrated successfully!")
        })
      } else {
        // Just create empty structure
        console.log("No data to migrate, creating empty structure...")

        // Create types
        await sql`DO $$ BEGIN
          CREATE TYPE intelligence.status AS ENUM ('active', 'archived', 'deleted');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$`

        await sql`DO $$ BEGIN
          CREATE TYPE intelligence.conversation_provider AS ENUM ('openai');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$`

        // Copy structure from intel schema
        await sql`
          CREATE TABLE intelligence.intelligence_topics (LIKE intel.intelligence_topics INCLUDING ALL)`

        await sql`
          CREATE TABLE intelligence.intelligence_topic_schema (LIKE intel.intelligence_topic_schema INCLUDING ALL)`

        await sql`
          CREATE TABLE intelligence.intelligence_topic_inputs (LIKE intel.intelligence_topic_inputs INCLUDING ALL)`

        await sql`
          CREATE TABLE intelligence.intelligence_topic_conversations (LIKE intel.intelligence_topic_conversations INCLUDING ALL)`

        await sql`
          CREATE TABLE intelligence.intelligence_topic_notes (LIKE intel.intelligence_topic_notes INCLUDING ALL)`
      }

      // Drop intel schema cascade (removes all tables and dependencies)
      console.log("Dropping old intel schema...")
      await sql`DROP SCHEMA IF EXISTS intel CASCADE`

      console.log("✅ Migration completed successfully!")
    }

    // Verify the new schema
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'intelligence'
      ORDER BY table_name`

    console.log("Tables in intelligence schema:", tables.map(t => t.table_name))

  } catch (error) {
    console.error("❌ Error during migration:", error)
    throw error
  } finally {
    await sql.end()
  }
}

migrateIntelToIntelligence().catch(console.error)