import {
  processDocumentationFiles,
  chunkDocument,
} from "./documentProcessor.js";
import {
  initializeEmbeddingModel,
  generateEmbeddingForChunk,
} from "./embeddingUtils.js";
import {
  connectToLanceDb,
  openOrCreateTable,
  addChunksToTable,
  deleteChunksBySourceFile,
} from "./lanceDbUtils.js";
import {
  loadIndexState,
  saveIndexState,
  hasFileChanged,
  hashFile,
} from "./fileUtils.js";
import { DocumentFile, EmbeddedChunk } from "./types.js";
import path from "path";
import fs from "fs-extra";

export async function runIndexingWorkflow(
  folder: string,
  options: any
): Promise<void> {
  const verbose = options.verbose;
  const force = options.force;
  const chunkSize = parseInt(options.chunkSize || "1000", 10);
  const chunkOverlap = parseInt(options.chunkOverlap || "200", 10);
  const dbPath = options.dbPath || path.join(folder, ".seta_lancedb");

  if (verbose) {
    console.log(`🚀 Starting indexing process for: ${folder}`);
    console.log(`📁 Documentation path: ${folder}`);
    console.log(`🗄️  Database path: ${dbPath}`);
    console.log("📋 Loading existing index state...");
  }

  // If force, remove DB and state
  if (force) {
    if (verbose)
      console.log("🧹 Removing previous database and state (force reindex)...");
    await fs.remove(dbPath);
  }

  let indexState = await loadIndexState(dbPath);

  if (verbose) console.log("🔍 Scanning documentation files...");
  const documentFiles = await processDocumentationFiles(folder, {
    include: options.include,
    exclude: options.exclude,
  });
  if (verbose)
    console.log(`📄 Found ${documentFiles.length} documentation files`);

  if (verbose) console.log("🧠 Initializing embedding model...");
  const model = await initializeEmbeddingModel();

  if (verbose) console.log("🔗 Connecting to LanceDB...");
  const db = await connectToLanceDb(dbPath);
  const table = await openOrCreateTable(db);

  // Handle deleted files (incremental mode only)
  if (!force) {
    const currentFiles = new Set(documentFiles.map((f) => f.filePath));
    const previouslyIndexed = Object.keys(indexState.files);
    for (const oldFile of previouslyIndexed) {
      if (!currentFiles.has(oldFile)) {
        if (verbose)
          console.log(`   🗑️  Removing deleted file from DB: ${oldFile}`);
        const relPath = oldFile.startsWith(folder)
          ? oldFile.slice(folder.length + 1).replace(/\\/g, "/")
          : oldFile;
        await deleteChunksBySourceFile(table, relPath);
        delete indexState.files[oldFile];
      }
    }
  }

  console.log(`⚙️  Processing ${documentFiles.length} documentation files...`);
  let processedCount = 0;
  let skippedCount = 0;
  let totalChunks = 0;

  for (const file of documentFiles) {
    if (!force && !(await hasFileChanged(file.filePath, indexState))) {
      if (verbose)
        console.log(`   ⏩ Skipping unchanged: ${file.relativePath}`);
      skippedCount++;
      continue;
    }

    if (verbose) console.log(`   📄 Processing: ${file.relativePath}`);
    const chunks = await chunkDocument(file, chunkSize, chunkOverlap, verbose);
    if (chunks.length === 0) {
      if (verbose)
        console.log(`   ⚠️  No chunks generated for: ${file.relativePath}`);
      continue;
    }

    if (verbose) console.log(`   📝 Generated ${chunks.length} chunks`);
    const embeddedChunks: EmbeddedChunk[] = [];
    for (const chunk of chunks) {
      const embedding = await generateEmbeddingForChunk(chunk.text, model);
      embeddedChunks.push({ ...chunk, embedding });
    }
    if (verbose)
      console.log(`   ✅ Generated ${embeddedChunks.length} embedded chunks`);

    await deleteChunksBySourceFile(table, file.relativePath);
    await addChunksToTable(table, embeddedChunks);

    // Update index state
    const stat = await fs.stat(file.filePath);
    const hash = await hashFile(file.filePath);
    indexState.files[file.filePath] = {
      hash: hash,
      lastModified: stat.mtime.toISOString(),
      chunkCount: embeddedChunks.length,
    };

    processedCount++;
    totalChunks += embeddedChunks.length;

    if (!verbose && processedCount % 5 === 0) {
      console.log(
        `   📊 Processed ${processedCount}/${documentFiles.length} files...`
      );
    }
  }

  if (!verbose) {
    console.log(
      `   ✅ Processed ${processedCount} files, skipped ${skippedCount} unchanged`
    );
  }
  indexState.lastUpdated = new Date().toISOString();
  await saveIndexState(dbPath, indexState);

  // Show final stats
  console.log("✅ Indexing completed");
  console.log("\n📊 Final Statistics:");
  const all = await table.query().limit(100000).toArray();
  const libraries = new Set(all.map((c: any) => c.libraryId));
  const topics = new Set(all.map((c: any) => c.topicName));
  console.log(`   - Total chunks: ${all.length}`);
  console.log(`   - Unique libraries: ${libraries.size}`);
  console.log(`   - Unique topics: ${topics.size}`);
  if (verbose) {
    console.log(`   - Database path: ${dbPath}`);
  }
}
