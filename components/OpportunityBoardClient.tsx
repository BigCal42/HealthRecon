"use client";

import { useState } from "react";
import type { SystemOpportunityBuckets } from "@/lib/getSystemOpportunities";
import { OPPORTUNITY_STAGES, type OpportunityStage, OPPORTUNITY_STAGE_LABELS } from "@/lib/opportunityStages";

interface OpportunityBoardClientProps {
  buckets: SystemOpportunityBuckets;
}

export function OpportunityBoardClient({ buckets }: OpportunityBoardClientProps) {
  const [data, setData] = useState(buckets);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function updateOpportunity(
    id: string,
    updates: { stage?: OpportunityStage; priority?: number | null }
  ) {
    try {
      setPendingId(id);
      setStatusMessage(null);

      const res = await fetch(`/api/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        setStatusMessage("Failed to update opportunity.");
        return;
      }

      const updated = json.data as any; // shape: updated opportunity row

      // Update local state: remove from old stage, insert into new stage
      setData((prev) => {
        const next = { ...prev, stages: { ...prev.stages } };

        // Remove from all stages
        for (const stage of OPPORTUNITY_STAGES) {
          next.stages[stage] = next.stages[stage].filter((o) => o.id !== updated.id);
        }

        const stage: OpportunityStage =
          (updated.stage && OPPORTUNITY_STAGES.includes(updated.stage as OpportunityStage)) ?
          (updated.stage as OpportunityStage) :
          "discovery";

        next.stages[stage] = [...next.stages[stage], updated];

        return next;
      });

      setStatusMessage("Opportunity updated.");
    } catch {
      setStatusMessage("Error updating opportunity.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      {statusMessage && <p>{statusMessage}</p>}
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
        {OPPORTUNITY_STAGES.map((stage) => {
          const items = data.stages[stage] ?? [];
          return (
            <div key={stage} style={{ border: "1px solid #ccc", padding: "1rem", minWidth: "200px" }}>
              <h2>{OPPORTUNITY_STAGE_LABELS[stage]}</h2>
              {items.length === 0 ? (
                <p>No opportunities.</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {items.map((opp) => (
                    <li key={opp.id} style={{ marginBottom: "1rem", padding: "0.5rem", border: "1px solid #eee" }}>
                      <p>
                        <strong>{opp.title}</strong>
                      </p>
                      {opp.amount && (
                        <p>
                          {opp.currency ?? "USD"} {opp.amount.toLocaleString()}
                        </p>
                      )}
                      {opp.close_date && <p>Close: {opp.close_date}</p>}
                      {opp.status && <p>Status: {opp.status}</p>}
                      <p>
                        Stage:{" "}
                        <select
                          value={opp.stage ?? "discovery"}
                          onChange={(e) =>
                            updateOpportunity(opp.id, {
                              stage: e.target.value as OpportunityStage,
                            })
                          }
                          disabled={pendingId === opp.id}
                        >
                          {OPPORTUNITY_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {OPPORTUNITY_STAGE_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

