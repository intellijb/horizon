import { dynamoDbService, dynamoDbDocumentOps } from "./index"
import { CreateTableCommand } from "@aws-sdk/client-dynamodb"

// Test script to verify DynamoDB connection
async function testDynamoDbConnection() {
  console.log("Testing DynamoDB connection...")

  try {
    // 1. Health check
    const isHealthy = await dynamoDbService.healthCheck()
    console.log("✅ Health check:", isHealthy ? "PASSED" : "FAILED")

    // 2. List tables
    const tables = await dynamoDbService.listTables()
    console.log("✅ Listed tables:", tables.TableNames || [])

    // 3. Create a test table
    const testTableName = "test_users"
    try {
      await dynamoDbService.createTable({
        TableName: testTableName,
        KeySchema: [
          { AttributeName: "id", KeyType: "HASH" },
        ],
        AttributeDefinitions: [
          { AttributeName: "id", AttributeType: "S" },
        ],
        BillingMode: "PAY_PER_REQUEST",
      })
      console.log(`✅ Created table: ${testTableName}`)
    } catch (error: any) {
      if (error.name === "ResourceInUseException") {
        console.log(`ℹ️  Table ${testTableName} already exists`)
      } else {
        throw error
      }
    }

    // 4. Test document operations
    const testUser = {
      id: "test-user-1",
      name: "John Doe",
      email: "john@example.com",
      createdAt: new Date().toISOString(),
    }

    // Put item
    await dynamoDbDocumentOps.put(testTableName, testUser)
    console.log("✅ Put item successful")

    // Get item
    const retrievedUser = await dynamoDbDocumentOps.get(testTableName, { id: "test-user-1" })
    console.log("✅ Get item successful:", retrievedUser)

    // Query items
    const queryResults = await dynamoDbDocumentOps.query(
      testTableName,
      "id = :id",
      { ":id": "test-user-1" }
    )
    console.log("✅ Query successful, found", queryResults.length, "items")

    // Update item
    await dynamoDbDocumentOps.update(
      testTableName,
      { id: "test-user-1" },
      "SET #name = :name",
      { ":name": "Jane Doe" },
      { "#name": "name" }
    )
    console.log("✅ Update item successful")

    // Scan table
    const scanResults = await dynamoDbDocumentOps.scan(testTableName)
    console.log("✅ Scan successful, found", scanResults.length, "items")

    // Delete item
    await dynamoDbDocumentOps.delete(testTableName, { id: "test-user-1" })
    console.log("✅ Delete item successful")

    console.log("\n🎉 All DynamoDB tests passed!")
  } catch (error) {
    console.error("❌ DynamoDB test failed:", error)
    process.exit(1)
  }
}

// Run the test
testDynamoDbConnection()