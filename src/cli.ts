import { Command } from "commander";
import { runIndexingWorkflow } from "./indexingWorkflow.js";
import {
  connectToLanceDb,
  openOrCreateTable,
  searchSimilarChunks,
} from "./lanceDbUtils.js";
import { loadIndexState } from "./fileUtils.js";
import fs from "fs-extra";
import path from "path";
import { SearchFilters } from "./types.js";

const program = new Command();

program
  .name("seta-indexer")
  .description("Vector database indexer for documentation")
  .version("1.0.0");

// Default/index command
program
  .argument("[folder]", "Documentation folder to index (default command)")
  .option("--verbose, -v", "Enable detailed logging")
  .option("--force", "Force re-indexing of all files")
  .option("--chunk-size <size>", "Chunk size in characters", "1000")
  .option("--chunk-overlap <overlap>", "Overlap between chunks", "200")
  .option("--model <model>", "Embedding model to use")
  .option("--db-path <path>", "Custom database path")
  .option(
    "--include <patterns...>",
    "Glob patterns to include (overrides default file types)"
  )
  .option("--exclude <patterns...>", "Glob patterns to exclude")
  .action(async (folder, options) => {
    if (folder) {
      await runIndexingWorkflow(folder, options);
      process.exit(0);
    }
  });

program
  .command("index <folder>")
  .description("Index documentation folder")
  .option("--verbose, -v", "Enable detailed logging")
  .option("--force", "Force re-indexing of all files")
  .option("--chunk-size <size>", "Chunk size in characters", "1000")
  .option("--chunk-overlap <overlap>", "Overlap between chunks", "200")
  .option("--model <model>", "Embedding model to use")
  .option("--db-path <path>", "Custom database path")
  .option(
    "--include <patterns...>",
    "Glob patterns to include (overrides default file types)"
  )
  .option("--exclude <patterns...>", "Glob patterns to exclude")
  .action(async (folder, options) => {
    await runIndexingWorkflow(folder, options);
    process.exit(0);
  });

program
  .command("search <query>")
  .description("Search indexed content")
  .argument("[folder]", "Documentation folder to search in (optional)")
  .option("--limit <number>", "Maximum results", "10")
  .option("--library <id>", "Filter by library ID")
  .option("--difficulty <level>", "Filter by difficulty")
  .option("--topic <name>", "Filter by topic")
  .option("--db-path <path>", "Custom database path")
  .action(async (query, folder, options) => {
    // Use same logic as indexing: folder/.seta_lancedb or custom path
    const dbPath = options.dbPath || path.join(folder || ".", ".seta_lancedb");
    const db = await connectToLanceDb(dbPath);
    const table = await openOrCreateTable(db);
    const { initializeEmbeddingModel, generateEmbeddingForChunk } =
      await import("./embeddingUtils.js");
    const model = await initializeEmbeddingModel();
    const embedding = await generateEmbeddingForChunk(query, model);
    const filters: SearchFilters = {};
    if (options.library) filters.libraryId = options.library;
    if (options.difficulty) filters.difficulty = options.difficulty;
    if (options.topic) filters.topicName = options.topic;
    const results = await searchSimilarChunks(
      table,
      embedding,
      parseInt(options.limit, 10),
      filters
    );
    console.log(
      `🔍 Found ${results.length} relevant documentation chunks for: "${query}"\n`
    );
    results.forEach((r, i) => {
      const rel =
        r._distance !== undefined
          ? ` (Relevance: ${(1 - r._distance).toFixed(3)})`
          : "";
      console.log(`## Result ${i + 1}${rel}`);
      if (r.libraryId) console.log(`**Library:** ${r.libraryId}`);
      if (r.topicName) console.log(`**Topic:** ${r.topicName}`);
      if (r.difficulty) console.log(`**Difficulty:** ${r.difficulty}`);
      if (r.originalFilePath)
        console.log(`**Source:** ${r.originalFilePath}\n`);
      console.log(r.text.slice(0, 300) + (r.text.length > 300 ? "..." : ""));
      console.log("\n---\n");
    });
    process.exit(0);
  });

program
  .command("stats")
  .description("Show database statistics")
  .argument("[folder]", "Documentation folder to check stats for (optional)")
  .option("--db-path <path>", "Custom database path")
  .action(async (folder, options) => {
    // Use same logic as indexing: folder/.seta_lancedb or custom path
    const dbPath = options.dbPath || path.join(folder || ".", ".seta_lancedb");
    const db = await connectToLanceDb(dbPath);
    const table = await openOrCreateTable(db);
    const all = await table.query().limit(100000).toArray();
    const libraries = new Set(all.map((c) => c.libraryId));
    const topics = new Set(all.map((c) => c.topicName));
    console.log("📊 Statistics:");
    console.log(`   - Total chunks: ${all.length}`);
    console.log(`   - Unique libraries: ${libraries.size}`);
    console.log(`   - Unique topics: ${topics.size}`);
    process.exit(0);
  });

program
  .command("clean")
  .description("Remove database")
  .argument("[folder]", "Documentation folder to clean (optional)")
  .option("--db-path <path>", "Custom database path")
  .action(async (folder, options) => {
    // Use same logic as indexing: folder/.seta_lancedb or custom path
    const dbPath = options.dbPath || path.join(folder || ".", ".seta_lancedb");
    await fs.remove(dbPath);
    console.log("🧹 Database removed:", dbPath);
    process.exit(0);
  });

program.parse(process.argv);
