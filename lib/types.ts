export interface System {
  id: string;
  slug: string;
  name: string;
  website?: string;
  hqCity?: string;
  hqState?: string;
}

export interface Document {
  id: string;
  systemId: string;
  sourceUrl: string;
  sourceType: "website" | "news" | "pdf" | "linkedin";
  title?: string;
  rawText?: string;
  crawledAt?: string;
}

export type EntityType = "person" | "facility" | "initiative" | "vendor" | "technology";

export interface Entity {
  id: string;
  systemId: string;
  type: EntityType;
  name: string;
  role?: string;
  attributes?: Record<string, unknown>;
  sourceDocumentId?: string;
}

export type SignalCategory =
  | "leadership_change"
  | "strategy"
  | "technology"
  | "finance"
  | "workforce"
  | "ai"
  | "epic_migration";

export type SignalSeverity = "low" | "medium" | "high";

export interface Signal {
  id: string;
  systemId: string;
  documentId?: string;
  severity: SignalSeverity;
  category: SignalCategory;
  summary: string;
  details?: Record<string, unknown>;
  createdAt?: string;
}

