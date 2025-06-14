export interface DocumentFile {
  filePath: string;
  relativePath: string;
  libraryId: string;
  topicName?: string;
}

export interface DocumentChunk {
  id: string;
  libraryId: string;
  topicName?: string;
  originalFilePath: string;
  text: string;
  order: number;
  metadata?: {
    difficulty?: string;
    use_cases?: string[];
    code_patterns?: string[];
    tags?: string[];
  };
}

export interface EmbeddedChunk extends DocumentChunk {
  embedding: number[];
}

export interface IndexState {
  files: Record<string, FileState>;
  lastUpdated: string;
}

export interface FileState {
  hash: string;
  lastModified: string;
  chunkCount: number;
}

export interface SearchFilters {
  libraryId?: string;
  difficulty?: string;
  topicName?: string;
}
