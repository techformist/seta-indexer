// LanceDB utility stubs
import * as lancedb from "@lancedb/lancedb";
import { EmbeddedChunk } from "./types.js";
import * as arrow from "apache-arrow";

const TABLE_NAME = "chunks";

export async function connectToLanceDb(
  dbPath: string
): Promise<lancedb.Connection> {
  return await lancedb.connect(dbPath);
}

export async function openOrCreateTable(
  db: lancedb.Connection,
  tableName: string = TABLE_NAME
): Promise<lancedb.Table> {
  try {
    return await db.openTable(tableName);
  } catch {
    // Let LanceDB infer schema from first batch of data, or create empty table with Arrow schema if needed
    // Here, we create an empty table with explicit Arrow schema for robustness
    const schema = new arrow.Schema([
      new arrow.Field("id", new arrow.Utf8(), false),
      new arrow.Field("libraryId", new arrow.Utf8(), false),
      new arrow.Field("topicName", new arrow.Utf8(), true),
      new arrow.Field("originalFilePath", new arrow.Utf8(), false),
      new arrow.Field("text", new arrow.Utf8(), false),
      new arrow.Field("order", new arrow.Int32(), false),
      new arrow.Field(
        "embedding",
        new arrow.FixedSizeList(
          384,
          new arrow.Field("item", new arrow.Float32(), true)
        ),
        false
      ),
      new arrow.Field("difficulty", new arrow.Utf8(), true),
      new arrow.Field(
        "use_cases",
        new arrow.List(new arrow.Field("item", new arrow.Utf8(), true)),
        true
      ),
      new arrow.Field(
        "code_patterns",
        new arrow.List(new arrow.Field("item", new arrow.Utf8(), true)),
        true
      ),
      new arrow.Field(
        "tags",
        new arrow.List(new arrow.Field("item", new arrow.Utf8(), true)),
        true
      ),
    ]);
    return await db.createEmptyTable(tableName, schema, { mode: "overwrite" });
  }
}

export async function addChunksToTable(
  table: lancedb.Table,
  chunks: EmbeddedChunk[]
): Promise<void> {
  // EmbeddedChunk is a plain object, so cast to Record<string, unknown>[]
  await table.add(chunks as unknown as Record<string, unknown>[]);
}

export async function searchSimilarChunks(
  table: lancedb.Table,
  queryEmbedding: number[],
  limit: number,
  filters?: any
): Promise<any[]> {
  let query = table.search(queryEmbedding).limit(limit);
  // LanceDB JS filter takes a SQL string, not separate args
  const filterClauses: string[] = [];
  if (filters) {
    if (filters.libraryId)
      filterClauses.push(`libraryId = '${filters.libraryId}'`);
    if (filters.difficulty)
      filterClauses.push(`difficulty = '${filters.difficulty}'`);
    if (filters.topicName)
      filterClauses.push(`topicName = '${filters.topicName}'`);
  }
  if (filterClauses.length > 0) {
    query = query.filter(filterClauses.join(" AND "));
  }
  return await query.toArray();
}

export async function deleteChunksBySourceFile(
  table: lancedb.Table,
  sourceFile: string
): Promise<void> {
  // Use SQL string for deletion with double quotes to handle case sensitivity
  await table.delete(`"originalFilePath" = '${sourceFile}'`);
}
