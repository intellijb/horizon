import {
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteItemCommand,
  CreateTableCommand,
  DescribeTableCommand,
  ListTablesCommand,
  type GetItemCommandInput,
  type GetItemCommandOutput,
  type PutItemCommandInput,
  type PutItemCommandOutput,
  type UpdateItemCommandInput,
  type UpdateItemCommandOutput,
  type DeleteItemCommandInput,
  type DeleteItemCommandOutput,
  type QueryCommandInput,
  type QueryCommandOutput,
  type ScanCommandInput,
  type ScanCommandOutput,
  type BatchWriteItemCommandInput,
  type BatchWriteItemCommandOutput,
  type CreateTableCommandInput,
  type CreateTableCommandOutput,
  type DescribeTableCommandInput,
  type DescribeTableCommandOutput,
  type ListTablesCommandInput,
  type ListTablesCommandOutput,
} from "@aws-sdk/client-dynamodb"
import { dynamoDbClient } from "./dynamodb.client"
import type { DynamoDbService } from "./dynamodb.types"

class DynamoDbServiceImpl implements DynamoDbService {
  public readonly client = dynamoDbClient

  async getItem(params: GetItemCommandInput): Promise<GetItemCommandOutput> {
    const command = new GetItemCommand(params)
    return await this.client.send(command)
  }

  async putItem(params: PutItemCommandInput): Promise<PutItemCommandOutput> {
    const command = new PutItemCommand(params)
    return await this.client.send(command)
  }

  async updateItem(params: UpdateItemCommandInput): Promise<UpdateItemCommandOutput> {
    const command = new UpdateItemCommand(params)
    return await this.client.send(command)
  }

  async deleteItem(params: DeleteItemCommandInput): Promise<DeleteItemCommandOutput> {
    const command = new DeleteItemCommand(params)
    return await this.client.send(command)
  }

  async query(params: QueryCommandInput): Promise<QueryCommandOutput> {
    const command = new QueryCommand(params)
    return await this.client.send(command)
  }

  async scan(params: ScanCommandInput): Promise<ScanCommandOutput> {
    const command = new ScanCommand(params)
    return await this.client.send(command)
  }

  async batchWriteItem(params: BatchWriteItemCommandInput): Promise<BatchWriteItemCommandOutput> {
    const command = new BatchWriteItemCommand(params)
    return await this.client.send(command)
  }

  async createTable(params: CreateTableCommandInput): Promise<CreateTableCommandOutput> {
    const command = new CreateTableCommand(params)
    return await this.client.send(command)
  }

  async describeTable(params: DescribeTableCommandInput): Promise<DescribeTableCommandOutput> {
    const command = new DescribeTableCommand(params)
    return await this.client.send(command)
  }

  async listTables(params?: ListTablesCommandInput): Promise<ListTablesCommandOutput> {
    const command = new ListTablesCommand(params || {})
    return await this.client.send(command)
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.listTables({ Limit: 1 })
      return true
    } catch (error) {
      console.error("DynamoDB health check failed:", error)
      return false
    }
  }
}

export const dynamoDbService = new DynamoDbServiceImpl()