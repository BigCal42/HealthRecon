/**
 * Converts a number array embedding to the string format required by pgvector
 * columns in Supabase. pgvector columns are typed as `string` in Supabase TypeScript
 * types and expect a JSON array string format.
 *
 * @param embedding - Array of numbers representing the embedding vector
 * @returns String representation of the embedding array (e.g., "[1,2,3]")
 */
export function embeddingToVectorString(embedding: number[]): string {
  return JSON.stringify(embedding);
}

