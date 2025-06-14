import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Use absolute paths to avoid current directory assumptions
const TEST_DOCS = path.resolve(process.cwd(), "temp_test_docs");
const CLI_PATH = path.resolve(process.cwd(), "dist/cli.js");

beforeAll(async () => {
  // Clean up any existing test directory
  await fs.remove(TEST_DOCS);
  await fs.ensureDir(TEST_DOCS);

  // Create realistic test documents
  await fs.writeFile(
    path.join(TEST_DOCS, "getting-started.md"),
    `# Getting Started Guide

Welcome to our documentation system! This guide will help you get started with indexing and searching your documents.

## What is Vector Indexing?

Vector indexing allows you to perform semantic search across your documentation. Instead of exact keyword matching, it understands the meaning and context of your queries.

## Key Features

- **Semantic Search**: Find relevant content even if exact keywords don't match
- **Multiple Formats**: Support for Markdown, PDF, and text files
- **Incremental Updates**: Only reprocess changed files
- **Fast Retrieval**: Optimized vector database for quick searches

## Installation

1. Clone the repository
2. Run npm install
3. Build the project with npm run build
4. Start indexing your documents

## Usage Examples

\`\`\`bash
# Index your documentation
seta-indexer index ./docs

# Search for content
seta-indexer search "how to install"

# Check database statistics
seta-indexer stats ./docs
\`\`\`
`
  );

  await fs.writeFile(
    path.join(TEST_DOCS, "api-reference.md"),
    `# API Reference

This document contains the complete API reference for the seta-indexer tool.

## Command Line Interface

### index command

Index a directory of documentation files.

**Syntax**: \`seta-indexer index <folder>\`

**Options**:
- \`--verbose\`: Enable detailed logging
- \`--force\`: Force re-indexing of all files
- \`--chunk-size <size>\`: Set chunk size in characters
- \`--chunk-overlap <overlap>\`: Set overlap between chunks

### search command

Search indexed documentation for relevant content.

**Syntax**: \`seta-indexer search <query> [folder]\`

**Options**:
- \`--limit <number>\`: Maximum number of results
- \`--library <id>\`: Filter by library ID
- \`--difficulty <level>\`: Filter by difficulty level

### stats command

Display statistics about the indexed database.

**Syntax**: \`seta-indexer stats [folder]\`

## Configuration

The indexer supports various configuration options through command-line flags or environment variables.
`
  );

  await fs.writeFile(
    path.join(TEST_DOCS, "troubleshooting.txt"),
    `TROUBLESHOOTING GUIDE

Common Issues and Solutions

1. Database Connection Errors
   - Check if the database path is correct
   - Ensure you have write permissions
   - Verify the database wasn't corrupted

2. Search Returns No Results
   - Make sure documents are properly indexed
   - Check if the query terms are relevant
   - Try broader search terms

3. Indexing Performance Issues
   - Reduce chunk size for faster processing
   - Use incremental indexing instead of full reindex
   - Check available memory and disk space

4. File Format Support
   - Supported formats: .md, .txt, .pdf
   - Ensure files are not corrupted
   - Check file encoding (UTF-8 recommended)

5. Vector Embedding Issues
   - Embedding model downloads automatically
   - Check internet connection for first run
   - Verify sufficient disk space for model files

For additional help, check the documentation or open an issue on GitHub.
`
  );
});

afterAll(async () => {
  // Clean up test directory
  await fs.remove(TEST_DOCS);
});

describe("Seta-Indexer CLI E2E Test", () => {
  it("should perform complete user workflow: index -> search -> stats", async () => {
    // Step 1: Index the test documents (as user would do)
    console.log(`\n🔄 Step 1: Indexing documents in ${TEST_DOCS}`);
    const indexResult = await execAsync(
      `node "${CLI_PATH}" index "${TEST_DOCS}" --verbose`
    );

    // Verify indexing completed without critical errors (LanceDB warnings are expected)
    expect(indexResult.stderr).not.toContain("Error:");
    expect(indexResult.stderr).not.toContain("Failed:");

    // Step 2: Check database statistics (as user would do)
    console.log("\n📊 Step 2: Checking database statistics");
    const statsResult = await execAsync(
      `node "${CLI_PATH}" stats "${TEST_DOCS}"`
    );

    expect(statsResult.stderr).not.toContain("Error:");
    expect(statsResult.stdout).toContain("📊 Statistics:");
    expect(statsResult.stdout).toContain("Total chunks:");

    // Parse stats to verify content was indexed
    const statsOutput = statsResult.stdout;
    const chunksMatch = statsOutput.match(/Total chunks: (\d+)/);
    const totalChunks = chunksMatch ? parseInt(chunksMatch[1]) : 0;

    expect(totalChunks).toBeGreaterThan(0);
    console.log(`   ✅ Found ${totalChunks} chunks in database`);

    // Step 3: Search for relevant content (as user would do)
    console.log("\n🔍 Step 3: Searching for 'installation' content");
    const searchResult1 = await execAsync(
      `node "${CLI_PATH}" search "installation guide" "${TEST_DOCS}"`
    );

    expect(searchResult1.stderr).not.toContain("Error:");
    expect(searchResult1.stdout).toContain("🔍 Found");
    expect(searchResult1.stdout).toContain("relevant documentation chunks");

    // Verify search found relevant content
    const searchOutput1 = searchResult1.stdout;
    const resultsMatch1 = searchOutput1.match(/Found (\d+) relevant/);
    const searchResults1 = resultsMatch1 ? parseInt(resultsMatch1[1]) : 0;

    expect(searchResults1).toBeGreaterThan(0);
    expect(searchOutput1.toLowerCase()).toMatch(
      /(install|setup|getting.started)/
    );
    console.log(
      `   ✅ Found ${searchResults1} relevant chunks for 'installation guide'`
    );

    // Step 4: Search for API-related content
    console.log("\n🔍 Step 4: Searching for 'API commands' content");
    const searchResult2 = await execAsync(
      `node "${CLI_PATH}" search "command line options" "${TEST_DOCS}"`
    );

    expect(searchResult2.stderr).not.toContain("Error:");
    const searchOutput2 = searchResult2.stdout;
    const resultsMatch2 = searchOutput2.match(/Found (\d+) relevant/);
    const searchResults2 = resultsMatch2 ? parseInt(resultsMatch2[1]) : 0;

    expect(searchResults2).toBeGreaterThan(0);
    expect(searchOutput2.toLowerCase()).toMatch(/(command|api|syntax|options)/);
    console.log(
      `   ✅ Found ${searchResults2} relevant chunks for 'command line options'`
    );

    // Step 5: Search for troubleshooting content
    console.log("\n🔍 Step 5: Searching for 'error handling' content");
    const searchResult3 = await execAsync(
      `node "${CLI_PATH}" search "database connection problems" "${TEST_DOCS}"`
    );

    expect(searchResult3.stderr).not.toContain("Error:");
    const searchOutput3 = searchResult3.stdout;
    const resultsMatch3 = searchOutput3.match(/Found (\d+) relevant/);
    const searchResults3 = resultsMatch3 ? parseInt(resultsMatch3[1]) : 0;

    expect(searchResults3).toBeGreaterThan(0);
    expect(searchOutput3.toLowerCase()).toMatch(
      /(error|problem|issue|troubleshoot)/
    );
    console.log(
      `   ✅ Found ${searchResults3} relevant chunks for 'database connection problems'`
    );

    // Step 6: Verify database files were created in the correct location
    console.log("\n📁 Step 6: Verifying database structure");
    const dbPath = path.join(TEST_DOCS, ".seta_lancedb");
    const dbExists = await fs.pathExists(dbPath);
    expect(dbExists).toBe(true);

    const chunksPath = path.join(dbPath, "chunks.lance");
    const chunksExists = await fs.pathExists(chunksPath);
    expect(chunksExists).toBe(true);
    console.log(`   ✅ Database created at ${dbPath}`);

    console.log("\n🎉 All tests passed! User workflow completed successfully.");
  }, 120000); // 2 minute timeout for embedding model download
});
