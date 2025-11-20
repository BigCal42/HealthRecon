"use client";

import { useState } from "react";
import Link from "next/link";
import type { GlobalStrategyDashboard } from "@/lib/getGlobalStrategyDashboard";

const HORIZON_OPTIONS: { value: "7d" | "30d" | "90d"; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

export function GlobalStrategyClient() {
  const [horizon, setHorizon] = useState<"7d" | "30d" | "90d">("30d");
  const [dashboard, setDashboard] = useState<GlobalStrategyDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setDashboard(null);

    try {
      const res = await fetch("/api/global-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horizon }),
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        setError(json?.error?.message ?? "Failed to generate global strategy dashboard.");
        return;
      }

      setDashboard(json.data as GlobalStrategyDashboard);
    } catch (err) {
      setError("Error calling global strategy dashboard API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <section style={{ marginTop: "2rem" }}>
        <h2>Time Horizon</h2>
        <p>Select the strategic time horizon for portfolio analysis.</p>
        <div style={{ marginBottom: "1rem" }}>
          <select
            value={horizon}
            onChange={(e) => setHorizon(e.target.value as "7d" | "30d" | "90d")}
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
            {loading ? "Generating..." : "Generate Global Strategy Dashboard"}
          </button>
        </div>
      </section>

      {error && (
        <section style={{ marginTop: "2rem", color: "red" }}>
          <p>{error}</p>
        </section>
      )}

      {dashboard && (
        <section style={{ marginTop: "2rem" }}>
          <h2>Executive Summary</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{dashboard.executiveSummary}</p>

          {dashboard.topThemes.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Top Themes</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {dashboard.topThemes.map((theme, i) => (
                  <li key={i} style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "4px" }}>
                    <p>
                      <strong>{theme.name}</strong>
                    </p>
                    <p>{theme.rationale}</p>
                    {theme.representativeSystems.length > 0 && (
                      <>
                        <p style={{ marginTop: "0.5rem", fontSize: "0.9em", fontWeight: "bold" }}>Representative Systems:</p>
                        <ul style={{ marginTop: "0.5rem" }}>
                          {theme.representativeSystems.map((slug, j) => (
                            <li key={j} style={{ fontSize: "0.9em", color: "#666" }}>
                              <Link href={`/systems/${slug}`}>{slug}</Link>
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

          {dashboard.risks.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Risks</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {dashboard.risks.map((risk, i) => (
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
                    {risk.affectedSystems.length > 0 && (
                      <>
                        <p style={{ marginTop: "0.5rem", fontSize: "0.9em", fontWeight: "bold" }}>Affected Systems:</p>
                        <ul style={{ marginTop: "0.5rem" }}>
                          {risk.affectedSystems.map((slug, j) => (
                            <li key={j} style={{ fontSize: "0.9em", color: "#666" }}>
                              <Link href={`/systems/${slug}`}>{slug}</Link>
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

          {dashboard.opportunities.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Opportunities</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {dashboard.opportunities.map((opp, i) => (
                  <li key={i} style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "4px" }}>
                    <p>
                      <strong>{opp.name}</strong>
                    </p>
                    <p>
                      <strong>Impact:</strong> {opp.impact}
                    </p>
                    <p>{opp.rationale}</p>
                    {opp.targetSystems.length > 0 && (
                      <>
                        <p style={{ marginTop: "0.5rem", fontSize: "0.9em", fontWeight: "bold" }}>Target Systems:</p>
                        <ul style={{ marginTop: "0.5rem" }}>
                          {opp.targetSystems.map((slug, j) => (
                            <li key={j} style={{ fontSize: "0.9em", color: "#666" }}>
                              <Link href={`/systems/${slug}`}>{slug}</Link>
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

          {dashboard.recommendations.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Recommendations</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {dashboard.recommendations.map((rec, i) => (
                  <li key={i} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "4px" }}>
                    <p>
                      <strong>{rec.action}</strong>
                    </p>
                    <p style={{ marginTop: "0.5rem", fontSize: "0.9em", color: "#666" }}>{rec.rationale}</p>
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

