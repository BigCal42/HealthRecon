"use client";

import { useState } from "react";
import type { StrategyBriefing } from "@/lib/getStrategyBriefing";

interface Props {
  systemSlug: string;
  systemName: string;
}

const HORIZON_OPTIONS: { value: number; label: string }[] = [
  { value: 6, label: "6 months" },
  { value: 12, label: "12 months" },
];

export function StrategyBriefingClient({ systemSlug, systemName }: Props) {
  const [horizonMonths, setHorizonMonths] = useState<number>(6);
  const [briefing, setBriefing] = useState<StrategyBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setBriefing(null);

    try {
      const res = await fetch("/api/strategy-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemSlug, horizonMonths }),
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        setError(json?.error?.message ?? "Failed to generate strategy briefing.");
        return;
      }

      setBriefing(json.data as StrategyBriefing);
    } catch (err) {
      setError("Error calling strategy briefing API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <section style={{ marginTop: "2rem" }}>
        <h2>Horizon</h2>
        <p>Select the strategic time horizon for {systemName}.</p>
        <div style={{ marginBottom: "1rem" }}>
          <select
            value={horizonMonths}
            onChange={(e) => setHorizonMonths(Number.parseInt(e.target.value, 10))}
            disabled={loading}
            style={{ padding: "0.5rem", fontSize: "1rem", minWidth: "200px" }}
          >
            {HORIZON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <button
            onClick={generate}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating..." : "Generate Strategy Briefing"}
          </button>
        </div>
      </section>

      {error && (
        <section style={{ marginTop: "2rem", color: "red" }}>
          <p>{error}</p>
        </section>
      )}

      {briefing && (
        <section style={{ marginTop: "2rem" }}>
          <h2>Executive Summary</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{briefing.executiveSummary}</p>

          {briefing.priorities.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Strategic Priorities</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {briefing.priorities.map((priority, i) => (
                  <li key={i} style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "4px" }}>
                    <p>
                      <strong>{priority.name}</strong>
                    </p>
                    <p>{priority.rationale}</p>
                    {priority.supportingSignals.length > 0 && (
                      <>
                        <p style={{ marginTop: "0.5rem", fontSize: "0.9em", fontWeight: "bold" }}>Supporting Signals:</p>
                        <ul style={{ marginTop: "0.5rem" }}>
                          {priority.supportingSignals.map((signal, j) => (
                            <li key={j} style={{ fontSize: "0.9em", color: "#666" }}>
                              {signal}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {briefing.risks.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Strategic Risks</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {briefing.risks.map((risk, i) => (
                  <li key={i} style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "4px" }}>
                    <p>
                      <strong>{risk.name}</strong>{" "}
                      <span
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.85em",
                          backgroundColor:
                            risk.severity === "high"
                              ? "#fee"
                              : risk.severity === "medium"
                                ? "#ffe"
                                : "#efe",
                          color:
                            risk.severity === "high"
                              ? "#c00"
                              : risk.severity === "medium"
                                ? "#880"
                                : "#080",
                        }}
                      >
                        {risk.severity.toUpperCase()}
                      </span>
                    </p>
                    <p>{risk.rationale}</p>
                    {risk.evidence.length > 0 && (
                      <>
                        <p style={{ marginTop: "0.5rem", fontSize: "0.9em", fontWeight: "bold" }}>Evidence:</p>
                        <ul style={{ marginTop: "0.5rem" }}>
                          {risk.evidence.map((ev, j) => (
                            <li key={j} style={{ fontSize: "0.9em", color: "#666" }}>
                              {ev}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    <p style={{ marginTop: "0.5rem", fontSize: "0.9em" }}>
                      <strong>Mitigation:</strong> {risk.mitigation}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}

          {briefing.opportunities.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Strategic Opportunities</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {briefing.opportunities.map((opp, i) => (
                  <li key={i} style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "4px" }}>
                    <p>
                      <strong>{opp.name}</strong>
                    </p>
                    <p>
                      <strong>Impact:</strong> {opp.impact}
                    </p>
                    <p>{opp.rationale}</p>
                    <p style={{ marginTop: "0.5rem", fontSize: "0.9em" }}>
                      <strong>Recommended Action:</strong> {opp.action}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}

          {briefing.recommendations.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Recommendations</h3>
              <ul>
                {briefing.recommendations.map((rec, i) => (
                  <li key={i} style={{ marginBottom: "0.5rem" }}>
                    {rec}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}

