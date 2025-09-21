import type {
  DynamoDBClient,
  GetItemCommandInput,
  GetItemCommandOutput,
  PutItemCommandInput,
  PutItemCommandOutput,
  QueryCommandInput,
  QueryCommandOutput,
  ScanCommandInput,
  ScanCommandOutput,
  DeleteItemCommandInput,
  DeleteItemCommandOutput,
  UpdateItemCommandInput,
  UpdateItemCommandOutput,
  BatchWriteItemCommandInput,
  BatchWriteItemCommandOutput,
  CreateTableCommandInput,
  CreateTableCommandOutput,
  DescribeTableCommandInput,
  DescribeTableCommandOutput,
  ListTablesCommandInput,
  ListTablesCommandOutput,
} from "@aws-sdk/client-dynamodb"

export interface DynamoDbConfig {
  endpoint?: string
  region: string
  credentials?: {
    accessKeyId: string
    secretAccessKey: string
  }
}

export interface DynamoDbService {
  client: DynamoDBClient

  // Basic CRUD operations
  getItem(params: GetItemCommandInput): Promise<GetItemCommandOutput>
  putItem(params: PutItemCommandInput): Promise<PutItemCommandOutput>
  updateItem(params: UpdateItemCommandInput): Promise<UpdateItemCommandOutput>
  deleteItem(params: DeleteItemCommandInput): Promise<DeleteItemCommandOutput>

  // Query and Scan operations
  query(params: QueryCommandInput): Promise<QueryCommandOutput>
  scan(params: ScanCommandInput): Promise<ScanCommandOutput>

  // Batch operations
  batchWriteItem(params: BatchWriteItemCommandInput): Promise<BatchWriteItemCommandOutput>

  // Table management
  createTable(params: CreateTableCommandInput): Promise<CreateTableCommandOutput>
  describeTable(params: DescribeTableCommandInput): Promise<DescribeTableCommandOutput>
  listTables(params?: ListTablesCommandInput): Promise<ListTablesCommandOutput>

  // Health check
  healthCheck(): Promise<boolean>
}