import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { sql } from "drizzle-orm"
import * as dotenv from "dotenv"

dotenv.config()

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || "postgresql://horizon:singularity2030@127.0.0.1:20432/horizon?statusColor=686B6F&env=local&name=%5BLOCAL%5D%20Horizon&tLSMode=0&usePrivateKey=false&safeModeLevel=0&advancedSafeModeLevel=0&driverVersion=0&lazyload=false"

  const pool = new Pool({
    connectionString,
  })

  const db = drizzle(pool)

  try {
    console.log("Adding userId fields to protected tables...")

    // Add userId to interview.sessions table
    await db.execute(sql`
      ALTER TABLE interview.sessions ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON interview.sessions(user_id)
    `)
    console.log("✓ Added userId to interview.sessions")

    // Add userId to llm.conversations_openai table
    await db.execute(sql`
      ALTER TABLE llm.conversations_openai ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS conversations_openai_user_id_idx ON llm.conversations_openai(user_id)
    `)
    console.log("✓ Added userId to llm.conversations_openai")

    // Add userId to llm.conversation_messages_openai table
    await db.execute(sql`
      ALTER TABLE llm.conversation_messages_openai ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS conversation_messages_openai_user_id_idx ON llm.conversation_messages_openai(user_id)
    `)
    console.log("✓ Added userId to llm.conversation_messages_openai")

    console.log("\n✅ Migration completed successfully!")
    console.log("\n⚠️  Note: Default userId '00000000-0000-0000-0000-000000000000' has been set for existing records.")
    console.log("   Update your application to provide actual userId values when creating new records.")

  } catch (error) {
    console.error("Migration failed:", error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()