import postgres from "postgres"
import * as dotenv from "dotenv"

dotenv.config()

const sql = postgres(process.env.POSTGRES_URI!)

async function fixIntelligenceTypes() {
  try {
    console.log("Fixing intelligence schema types...")

    // Fix the status column in intelligence_topic_inputs
    await sql`
      ALTER TABLE intelligence.intelligence_topic_inputs
      ALTER COLUMN status TYPE intelligence.status
      USING status::text::intelligence.status`

    // Fix the conversation_provider column in intelligence_topic_conversations
    await sql`
      ALTER TABLE intelligence.intelligence_topic_conversations
      ALTER COLUMN conversation_provider TYPE intelligence.conversation_provider
      USING conversation_provider::text::intelligence.conversation_provider`

    console.log("✅ Types fixed successfully!")

    // Verify the data
    const sampleInput = await sql`
      SELECT id, status FROM intelligence.intelligence_topic_inputs LIMIT 1`

    if (sampleInput.length > 0) {
      console.log("Sample input status:", sampleInput[0].status)
    }

    const sampleConv = await sql`
      SELECT id, conversation_provider FROM intelligence.intelligence_topic_conversations LIMIT 1`

    if (sampleConv.length > 0) {
      console.log("Sample conversation provider:", sampleConv[0].conversation_provider)
    }

  } catch (error) {
    console.error("❌ Error fixing types:", error)
    throw error
  } finally {
    await sql.end()
  }
}

fixIntelligenceTypes().catch(console.error)