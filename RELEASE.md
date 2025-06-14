# Release Notes: seta-indexer v0.1.0

## Highlights

- Standalone CLI for vector-based documentation indexing and search
- Supports PDF, Markdown, MDX, TXT, JSON, YAML, XML, CSV
- Local embeddings with all-MiniLM-L6-v2 (no cloud dependency)
- LanceDB vector storage and similarity search
- Incremental indexing with file change detection
- Flexible file selection with --include/--exclude glob patterns
- CLI commands: `index`, `search`, `stats`, `clean`
- Filtering by library, topic, difficulty
- Configurable chunk size and overlap
- Clear progress and search output

## Usage

- See README for full CLI usage and options

## Known Limitations

- No web UI (CLI only)
- Embedding model download may require initial internet access
- Large PDFs may be slow to process
- No distributed/remote DB support (local only)
- No authentication or access control
