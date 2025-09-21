import { config, isDevelopment, isTest } from "@/config"
import type { DynamoDbConfig } from "./dynamodb.types"

export const getDynamoDbConfig = (): DynamoDbConfig => {
  const dynamoConfig: DynamoDbConfig = {
    region: config.AWS_REGION,
  }

  // For local development, use DynamoDB Local
  if (isDevelopment || isTest) {
    dynamoConfig.endpoint = config.DYNAMODB_ENDPOINT || "http://localhost:20800"
    dynamoConfig.credentials = {
      accessKeyId: "local",
      secretAccessKey: "local",
    }
  } else if (config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY) {
    // For production, use real AWS credentials if provided
    dynamoConfig.credentials = {
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    }
  }
  // Otherwise, use IAM roles (when running on AWS infrastructure)

  return dynamoConfig
}