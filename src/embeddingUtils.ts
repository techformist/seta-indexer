import { pipeline, FeatureExtractionPipeline } from "@xenova/transformers";

let cachedModel: FeatureExtractionPipeline | null = null;

export async function initializeEmbeddingModel(): Promise<FeatureExtractionPipeline> {
  if (cachedModel) return cachedModel;
  cachedModel = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  return cachedModel;
}

export async function generateEmbeddingForChunk(
  chunkText: string,
  modelPipeline: FeatureExtractionPipeline
): Promise<number[]> {
  try {
    const output = await modelPipeline(chunkText, {
      pooling: "mean",
      normalize: true,
    });

    // Handle different output formats from the transformer
    let embedding: number[] = [];
    if (output && typeof output === "object" && "data" in output) {
      // Handle Tensor-like output
      embedding = Array.from(output.data as Float32Array);
    } else if (Array.isArray(output) && Array.isArray(output[0])) {
      embedding = output[0];
    } else if (Array.isArray(output)) {
      embedding = output;
    }

    // Ensure we have a valid numeric array
    if (
      embedding.length > 0 &&
      embedding.every((val) => typeof val === "number" && !isNaN(val))
    ) {
      return embedding;
    }

    throw new Error("Invalid embedding format received from model");
  } catch (e) {
    console.warn("Embedding generation failed, using zero vector:", e);
    // Fallback: zero vector of length 384 (MiniLM)
    return new Array(384).fill(0);
  }
}
