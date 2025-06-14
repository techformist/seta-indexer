import { DocumentFile, DocumentChunk } from "./types.js";
import {
  SUPPORTED_EXTENSIONS,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
} from "./config.js";
import fs from "fs-extra";
import { globby } from "globby";
import path from "path";
import { extractTextFromPdf } from "./pdfUtils.js";

function splitTextSmart(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  // Split by paragraph, then by sentence, then by chunk size
  const paras = text.split(/\n{2,}/);
  let chunks: string[] = [];
  for (const para of paras) {
    if (para.length <= chunkSize) {
      chunks.push(para);
    } else {
      // Split by sentence
      const sentences = para.match(/[^.!?\n]+[.!?\n]+/g) || [para];
      let buf = "";
      for (const sent of sentences) {
        if ((buf + sent).length > chunkSize) {
          if (buf) chunks.push(buf);
          buf = sent;
        } else {
          buf += sent;
        }
      }
      if (buf) chunks.push(buf);
    }
  }
  // Add overlap
  if (chunkOverlap > 0 && chunks.length > 1) {
    const overlapped: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i];
      if (i > 0) {
        const prev = chunks[i - 1];
        chunk = prev.slice(-chunkOverlap) + chunk;
      }
      overlapped.push(chunk);
    }
    return overlapped;
  }
  return chunks;
}

export async function processDocumentationFiles(
  folder: string,
  options: { include?: string[]; exclude?: string[] } = {}
): Promise<DocumentFile[]> {
  const patterns =
    options.include && options.include.length > 0
      ? options.include
      : SUPPORTED_EXTENSIONS.map((ext) => `**/*${ext}`);
  const files = await globby(patterns, {
    cwd: folder,
    absolute: true,
    ignore: options.exclude || [],
  });
  const documentFiles: DocumentFile[] = [];
  for (const filePath of files) {
    const relativePath = path.relative(folder, filePath).replace(/\\/g, "/");
    // Use first folder as libraryId, second as topicName if present
    const parts = relativePath.split("/");
    let libraryId = parts[0];
    let topicName = parts.length > 2 ? parts[1] : undefined;
    documentFiles.push({ filePath, relativePath, libraryId, topicName });
  }
  return documentFiles;
}

export async function chunkDocument(
  file: DocumentFile,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  chunkOverlap: number = DEFAULT_CHUNK_OVERLAP,
  verbose: boolean = false
): Promise<DocumentChunk[]> {
  let text = "";
  if (file.filePath.endsWith(".pdf")) {
    if (verbose) console.log(`   📄 Processing PDF: ${file.relativePath}`);
    try {
      text = await extractTextFromPdf(file.filePath);
      if (verbose)
        console.log(`   ✅ PDF processed successfully: ${file.relativePath}`);
    } catch (error) {
      console.log(
        `   ⚠️  PDF processing failed: ${file.relativePath} - ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      if (verbose)
        console.log(`   📝 Skipping PDF file due to processing error`);
      return []; // Return empty chunks for failed PDFs
    }
  } else {
    if (verbose) {
      const ext = path.extname(file.filePath).toLowerCase();
      const fileType =
        ext === ".md" ? "Markdown" : ext === ".txt" ? "Text" : "Document";
      console.log(`   📄 Processing ${fileType}: ${file.relativePath}`);
    }
    try {
      text = await fs.readFile(file.filePath, "utf8");
      if (verbose)
        console.log(`   ✅ File processed successfully: ${file.relativePath}`);
    } catch (error) {
      console.log(
        `   ⚠️  File processing failed: ${file.relativePath} - ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      if (verbose) console.log(`   📝 Skipping file due to processing error`);
      return []; // Return empty chunks for failed files
    }
  }
  const chunks = splitTextSmart(text, chunkSize, chunkOverlap);
  return chunks.map((chunk, i) => ({
    id: `${file.relativePath}::${i}`,
    libraryId: file.libraryId,
    topicName: file.topicName,
    originalFilePath: file.relativePath,
    text: chunk,
    order: i,
    metadata: {},
  }));
}
