import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "fs-extra";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";

// Configure the worker for Node.js environment (ESM compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workerPath = join(
  __dirname,
  "../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
);
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  const buffer = await fs.readFile(pdfPath);
  const data = new Uint8Array(buffer);

  // Set a timeout to avoid hanging
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error("PDF processing timeout after 30 seconds")),
      30000
    );
  });

  const pdfPromise = pdfjsLib.getDocument({
    data,
    standardFontDataUrl: pathToFileURL(
      join(__dirname, "../node_modules/pdfjs-dist/standard_fonts/")
    ).href,
  }).promise;

  const pdf = await Promise.race([pdfPromise, timeoutPromise]);
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(" ") + "\n";
  }
  return text;
}
