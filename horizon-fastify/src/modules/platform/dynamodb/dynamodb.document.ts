import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb"
import { dynamoDbClient } from "./dynamodb.client"

// Create a DynamoDB Document Client for easier JSON operations
export const docClient = DynamoDBDocumentClient.from(dynamoDbClient, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
})

// Helper functions for common document operations
export const dynamoDbDocumentOps = {
  async get<T = any>(tableName: string, key: Record<string, any>): Promise<T | undefined> {
    const response = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: key,
      })
    )
    return response.Item as T | undefined
  },

  async put<T = any>(tableName: string, item: T): Promise<void> {
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: item as Record<string, any>,
      })
    )
  },

  async update(
    tableName: string,
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeValues?: Record<string, any>,
    expressionAttributeNames?: Record<string, string>
  ): Promise<void> {
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
      })
    )
  },

  async delete(tableName: string, key: Record<string, any>): Promise<void> {
    await docClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: key,
      })
    )
  },

  async query<T = any>(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    expressionAttributeNames?: Record<string, string>
  ): Promise<T[]> {
    const response = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
      })
    )
    return (response.Items || []) as T[]
  },

  async scan<T = any>(
    tableName: string,
    filterExpression?: string,
    expressionAttributeValues?: Record<string, any>,
    expressionAttributeNames?: Record<string, string>
  ): Promise<T[]> {
    const response = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
      })
    )
    return (response.Items || []) as T[]
  },

  async batchWrite(tableName: string, items: any[], operation: "put" | "delete" = "put"): Promise<void> {
    const requests = items.map(item => {
      if (operation === "put") {
        return { PutRequest: { Item: item } }
      } else {
        return { DeleteRequest: { Key: item } }
      }
    })

    // DynamoDB limits batch writes to 25 items
    const chunks = []
    for (let i = 0; i < requests.length; i += 25) {
      chunks.push(requests.slice(i, i + 25))
    }

    for (const chunk of chunks) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName]: chunk,
          },
        })
      )
    }
  },
}