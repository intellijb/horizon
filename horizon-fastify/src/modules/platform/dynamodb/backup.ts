import { dynamoDbService, dynamoDbDocumentOps } from "./index"
import fs from "fs/promises"
import path from "path"

export async function exportTables(outputDir: string = "./backups") {
  console.log("Starting DynamoDB backup...")

  // Ensure backup directory exists
  await fs.mkdir(outputDir, { recursive: true })

  // List all tables
  const tables = await dynamoDbService.listTables()
  const tableNames = tables.TableNames || []

  const backup: Record<string, any> = {
    timestamp: new Date().toISOString(),
    tables: {},
  }

  for (const tableName of tableNames) {
    console.log(`Backing up table: ${tableName}`)

    // Get table description
    const tableDesc = await dynamoDbService.describeTable({ TableName: tableName })

    // Scan all items
    const items = await dynamoDbDocumentOps.scan(tableName)

    backup.tables[tableName] = {
      schema: tableDesc.Table,
      items: items,
    }
  }

  // Save to file
  const filename = `dynamodb-backup-${Date.now()}.json`
  const filepath = path.join(outputDir, filename)
  await fs.writeFile(filepath, JSON.stringify(backup, null, 2))

  console.log(`✅ Backup saved to: ${filepath}`)
  return filepath
}

export async function importTables(backupFile: string) {
  console.log(`Restoring from: ${backupFile}`)

  const backupData = JSON.parse(await fs.readFile(backupFile, "utf-8"))

  for (const [tableName, tableData] of Object.entries(backupData.tables)) {
    const { schema, items } = tableData as any

    console.log(`Restoring table: ${tableName}`)

    // Check if table exists
    try {
      await dynamoDbService.describeTable({ TableName: tableName })
      console.log(`Table ${tableName} already exists, skipping creation`)
    } catch (error) {
      // Create table if it doesn't exist
      await dynamoDbService.createTable({
        TableName: schema.TableName,
        KeySchema: schema.KeySchema,
        AttributeDefinitions: schema.AttributeDefinitions,
        BillingMode: schema.BillingModeSummary?.BillingMode || "PAY_PER_REQUEST",
      })
      console.log(`Created table: ${tableName}`)
    }

    // Restore items
    if (items && items.length > 0) {
      await dynamoDbDocumentOps.batchWrite(tableName, items, "put")
      console.log(`Restored ${items.length} items to ${tableName}`)
    }
  }

  console.log("✅ Restore complete!")
}

// CLI usage
if (process.argv[2] === "export") {
  exportTables(process.argv[3])
} else if (process.argv[2] === "import" && process.argv[3]) {
  importTables(process.argv[3])
}