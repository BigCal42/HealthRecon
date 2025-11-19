/**
 * Shared types for chat API and client components.
 * Ensures consistent response shapes across the RAG chat system.
 */

export interface ChatSource {
  documentId: string;
  title: string | null;
  sourceUrl?: string | null;
  sourceType?: string | null;
}

export interface ChatResponsePayload {
  answer: string;
  sources: ChatSource[];
}

