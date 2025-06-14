# Sample Documentation

This is a sample markdown file for testing the seta-indexer utility.

## Features

The seta-indexer supports:

- Markdown files (.md)
- Text files (.txt)
- PDF files (.pdf)
- Incremental indexing
- Vector search using embeddings

## Usage

You can index documents and search through them using semantic similarity.

### Example Commands

```bash
# Index a folder
seta-indexer index ./docs

# Search for content
seta-indexer search "how to use embeddings"

# Show statistics
seta-indexer stats
```

## Technical Details

The indexer uses:

- LanceDB for vector storage
- Local embeddings for semantic search
- Chunking for large documents
- File change detection for incremental updates
