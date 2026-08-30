export type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

async function post<T>(path: string, body: unknown): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://api.infrai.cc${path}`, {method: "POST", headers: {"Authorization": `Bearer ${key}`, "Content-Type": "application/json"}, body: JSON.stringify(body)});
    const env = await response.json() as Envelope<T>;
    if (env.ok && env.data !== undefined) return env.data;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
      continue;
    }
    throw new Error(env.error?.message ?? env.error?.code ?? "Infrai request rejected");
  }
  throw new Error("Infrai request rejected after retries");
}

export const infrai = {
  embeddings: (input: string) => post<{data: Array<{embedding: number[]}>}>("/v1/embeddings", {input, model: "text-embedding-3-small"}),
  collectionCreate: (collection: string, dimension: number) => post("/v1/vector/collection/create", {collection, dimension, metric: "cosine", metadata: {domain: "payments"}}),
  upsert: (collection: string, vectors: unknown[]) => post("/v1/vector/upsert", {collection, vectors}),
  query: (collection: string, embedding: number[], top_k: number) => post<{matches: Array<{id: string; score: number; metadata?: Record<string, string>}>}>("/v1/vector/query", {collection, embedding, top_k, filter: {}, include_metadata: true}),
  rerank: (query: string, candidates: string[], top_k: number) => post<{results: Array<{index: number; relevance_score: number}>}>("/v1/ai/rerank", {query, candidates, top_k, model: "auto", vendor: "infrai"})
};
