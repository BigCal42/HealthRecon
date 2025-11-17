import type { EntityType, SignalCategory, SignalSeverity } from "./types";

export interface ExtractionEntity {
  type: EntityType;
  name: string;
  role?: string;
  attributes?: Record<string, unknown>;
}

export interface ExtractionSignal {
  category: SignalCategory;
  severity: SignalSeverity;
  summary: string;
  details?: Record<string, unknown>;
}

export interface ExtractionResult {
  entities: ExtractionEntity[];
  signals: ExtractionSignal[];
}

