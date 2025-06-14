import { IndexState } from "./types.js";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";

function getStateFilePath(dbPath: string) {
  return path.join(dbPath, ".seta_lancedb", "index_state.json");
}

export async function loadIndexState(dbPath: string): Promise<IndexState> {
  const stateFile = getStateFilePath(dbPath);
  if (await fs.pathExists(stateFile)) {
    return await fs.readJson(stateFile);
  }
  return { files: {}, lastUpdated: new Date().toISOString() };
}

export async function saveIndexState(
  dbPath: string,
  state: IndexState
): Promise<void> {
  const stateFile = getStateFilePath(dbPath);
  await fs.ensureDir(path.dirname(stateFile));
  await fs.writeJson(stateFile, state, { spaces: 2 });
}

export async function hasFileChanged(
  filePath: string,
  existingState: IndexState
): Promise<boolean> {
  const stat = await fs.stat(filePath);
  const hash = await hashFile(filePath);
  const prev = existingState.files[filePath];
  return (
    !prev ||
    prev.hash !== hash ||
    prev.lastModified !== stat.mtime.toISOString()
  );
}

export async function hashFile(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(filePath);
  return new Promise((resolve, reject) => {
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}
