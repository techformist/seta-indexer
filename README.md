# seta-indexer

A standalone CLI tool for vector database indexing and semantic search over documentation. Supports PDF, Markdown, text, and more. Powered by local embeddings and LanceDB.

## Features

- Indexes PDF, Markdown, MDX, TXT, JSON, YAML, XML, CSV
- Intelligent chunking with sentence/paragraph boundary detection
- Fast local embeddings with all-MiniLM-L6-v2 (via @xenova/transformers)
- Vector similarity search with filtering (library, topic, difficulty)
- Incremental updates and file change detection
- Flexible file selection with `--include` and `--exclude` glob patterns

## Installation

```bash
npm install -g seta-indexer
# or use npx
npx seta-indexer <folder> [options]
```

## Usage

### Index a documentation folder

```bash
npx seta-indexer /path/to/docs
```

### Local usage (from cloned repo)

```bash
# Clone and setup
git clone https://github.com/techformist/seta-indexer.git
cd seta-indexer
npm install

# Build the project
npm run build

# Run locally with node
node dist/cli.js /path/to/docs

# Or use the dev script for development
npm run dev -- index /path/to/docs
```

### Available commands (local usage)

```bash
# Index documents
node dist/cli.js index /path/to/docs --verbose

# Search indexed content
node dist/cli.js search "your query" /path/to/docs

# Show database statistics
node dist/cli.js stats /path/to/docs

# Clean/remove database
node dist/cli.js clean /path/to/docs

# Run tests
npm test
```

#### With options

- `--verbose, -v` : Detailed logging
- `--force` : Force re-index all files
- `--chunk-size <size>` : Chunk size (default: 1000)
- `--chunk-overlap <overlap>` : Overlap (default: 200)
- `--model <model>` : Embedding model (default: all-MiniLM-L6-v2)
- `--db-path <path>` : Custom DB path
- `--include <patterns...>` : Glob patterns to include (e.g. `**/*.md` `docs/**/*.pdf`)
- `--exclude <patterns...>` : Glob patterns to exclude (e.g. `**/drafts/**`)

## Supported File Types

- .pdf, .md, .mdx, .txt, .json, .yaml, .yml, .xml, .csv (by default)
- Use `--include`/`--exclude` for custom file selection

## Output Examples

**Indexing:**

```
🚀 Starting indexing process for: /docs
📁 Documentation path: /docs
🗄️  Database path: /docs/.seta_lancedb
📋 Loading existing index state...
🔍 Scanning documentation files...
📄 Found 25 documentation files
🧠 Initializing embedding model...
🔗 Connecting to LanceDB...
⚙️  Processing documentation files...
   📄 Processing: main_guide.md
   📝 Generated 12 chunks
   ✅ Generated 12 embedded chunks
✅ Indexing completed
```

## Troubleshooting

- Ensure all dependencies are installed (`npm install`)
- For PDF extraction errors, check file integrity
- For embedding errors, ensure enough RAM and disk space for model caching
- For DB errors, use `--force` to re-index from scratch

## License

MIT
