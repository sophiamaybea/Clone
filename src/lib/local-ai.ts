let clipExtractorPromise: Promise<any> | null = null;

function normalise(values: ArrayLike<number>) {
  const vector = Array.from(values, Number);
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

export async function extractImageText(file: Blob): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(file);
    return result.data.text.replace(/\s+/g, " ").trim();
  } finally {
    await worker.terminate();
  }
}

export async function extractVisualEmbedding(file: Blob): Promise<number[]> {
  const { pipeline, RawImage } = await import("@huggingface/transformers");

  clipExtractorPromise ??= pipeline(
    "image-feature-extraction",
    "Xenova/clip-vit-base-patch32",
    {
      dtype: "q8",
    },
  );

  const extractor = await clipExtractorPromise;
  const image = await RawImage.fromBlob(file);
  const tensor = await extractor(image);
  const values =
    tensor?.data instanceof Float32Array || ArrayBuffer.isView(tensor?.data)
      ? tensor.data
      : Array.isArray(tensor?.data)
        ? tensor.data
        : [];

  if (!values.length) {
    throw new Error("The visual embedding model returned no features.");
  }

  return normalise(values);
}
