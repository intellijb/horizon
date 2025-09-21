import { ListTablesCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb"

async function testConnection() {
  console.log("Creating DynamoDB client...")

  const client = new DynamoDBClient({
    region: "us-east-1",
    endpoint: "http://localhost:20800",
    credentials: {
      accessKeyId: "local",
      secretAccessKey: "local",
    },
  })

  console.log("Sending ListTables command...")

  try {
    const command = new ListTablesCommand({})
    const response = await client.send(command)
    console.log("✅ Success! Tables:", response.TableNames || [])
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

testConnection()