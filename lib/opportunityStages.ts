export const OPPORTUNITY_STAGES = [
  "discovery",
  "qualifying",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const;

export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export function isOpportunityStage(value: string): value is OpportunityStage {
  return (OPPORTUNITY_STAGES as readonly string[]).includes(value);
}

export const OPPORTUNITY_STAGE_LABELS: Record<OpportunityStage, string> = {
  discovery: "Discovery",
  qualifying: "Qualifying",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

