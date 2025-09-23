import { createDatabase } from "./src/modules/platform/database"
import { categories, topics, interviewers } from "./src/modules/features/interview/extensions/schema/interview.schema"

async function seedTestData() {
  const db = createDatabase()

  console.log("🌱 Seeding test interview data with UUIDs...")

  try {
    // Insert a test category
    await db.insert(categories).values({
      id: "550e8400-e29b-41d4-a716-446655440000",
      type: "tech",
      name: "System Design",
      description: "Large-scale distributed systems",
    }).onConflictDoNothing()

    // Insert test topics
    await db.insert(topics).values([
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        categoryId: "550e8400-e29b-41d4-a716-446655440000",
        name: "Design URL Shortener",
        description: "Design a scalable URL shortening service",
        difficulty: 3,
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440002",
        categoryId: "550e8400-e29b-41d4-a716-446655440000",
        name: "Design Chat System",
        description: "Design a real-time chat application",
        difficulty: 4,
      },
    ]).onConflictDoNothing()

    // Insert a test interviewer
    await db.insert(interviewers).values({
      id: "550e8400-e29b-41d4-a716-446655440010",
      displayName: "Senior System Design Expert",
      company: "Tech Corp",
      role: "Principal Engineer",
      typeCoverage: ["tech"],
      topicIds: ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"],
      difficulty: 3,
      language: "en",
    }).onConflictDoNothing()

    console.log("✅ Test data seeded successfully!")
    process.exit(0)
  } catch (error) {
    console.error("❌ Error seeding test data:", error)
    process.exit(1)
  }
}

seedTestData()