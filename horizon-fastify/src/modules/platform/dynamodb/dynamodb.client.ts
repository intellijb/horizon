import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { getDynamoDbConfig } from "./dynamodb.config"

let client: DynamoDBClient | null = null

export function getDynamoDbClient(): DynamoDBClient {
  if (!client) {
    const config = getDynamoDbConfig()
    client = new DynamoDBClient({
      region: config.region,
      ...(config.endpoint && { endpoint: config.endpoint }),
      ...(config.credentials && { credentials: config.credentials }),
    })
  }
  return client
}

export const dynamoDbClient = getDynamoDbClient()