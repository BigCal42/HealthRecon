"use client";

import { useState, useEffect, useCallback } from "react";

import type { SystemComparison } from "@/lib/compareSystems";

type System = {
  id: string;
  slug: string;
  name: string;
};

export function CompareClient() {
  const [systems, setSystems] = useState<System[]>([]);
  const [systemASlug, setSystemASlug] = useState<string>("");
  const [systemBSlug, setSystemBSlug] = useState<string>("");
  const [comparison, setComparison] = useState<SystemComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string>("");

  const fetchSystems = useCallback(async () => {
    try {
      const res = await fetch("/api/systems");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load systems");
        return;
      }

      setSystems(data.systems ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  useEffect(() => {
    fetchSystems();
  }, [fetchSystems]);

  const handleCompare = async () => {
    if (!systemASlug || !systemBSlug) {
      setError("Please select both systems");
      return;
    }

    if (systemASlug === systemBSlug) {
      setError("Please select two different systems");
      return;
    }

    setLoading(true);
    setError(null);
    setComparison(null);
    setCopyStatus("");

    try {
      const res = await fetch(
        `/api/compare?slugA=${encodeURIComponent(systemASlug)}&slugB=${encodeURIComponent(systemBSlug)}`,
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? data.message ?? "Failed to compare systems");
        return;
      }

      setComparison(data.comparison);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  async function copyExecutiveBrief() {
    if (!comparison?.executiveBrief) return;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(comparison.executiveBrief);
      setCopyStatus("Executive brief copied to clipboard.");
      setTimeout(() => setCopyStatus(""), 3000);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="systemA" style={{ display: "block", marginBottom: "0.5rem" }}>
            System A:
          </label>
          <select
            id="systemA"
            value={systemASlug}
            onChange={(e) => setSystemASlug(e.target.value)}
            style={{ padding: "0.5rem", minWidth: "300px" }}
          >
            <option value="">Select System A</option>
            {systems.map((system) => (
              <option key={system.id} value={system.slug}>
                {system.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="systemB" style={{ display: "block", marginBottom: "0.5rem" }}>
            System B:
          </label>
          <select
            id="systemB"
            value={systemBSlug}
            onChange={(e) => setSystemBSlug(e.target.value)}
            style={{ padding: "0.5rem", minWidth: "300px" }}
          >
            <option value="">Select System B</option>
            {systems.map((system) => (
              <option key={system.id} value={system.slug}>
                {system.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCompare}
          disabled={loading || !systemASlug || !systemBSlug}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: loading ? "#ccc" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Comparing..." : "Compare"}
        </button>
      </div>

      {error && (
        <div style={{ color: "red", marginBottom: "1rem", padding: "0.5rem", backgroundColor: "#ffe6e6" }}>
          {error}
        </div>
      )}

      {comparison && (
        <div>
          <h2>
            {comparison.systemA.name} vs {comparison.systemB.name}
          </h2>

          {comparison.executiveBrief && (
            <>
              <h3>Executive Brief</h3>
              <p style={{ whiteSpace: "pre-wrap" }}>{comparison.executiveBrief}</p>
              <button
                onClick={copyExecutiveBrief}
                disabled={!comparison.executiveBrief}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#0070f3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  marginTop: "0.5rem",
                }}
              >
                Copy Executive Brief
              </button>
              {copyStatus && (
                <p style={{ color: "green", marginTop: "0.5rem" }}>{copyStatus}</p>
              )}
            </>
          )}

          <h3>Summary</h3>
          <ul>
            {comparison.summary
              .filter((item) => item !== "pending_generation")
              .map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
          </ul>

          <h3>Signals</h3>
          <div style={{ marginBottom: "1rem" }}>
            <p>
              <strong>{comparison.systemA.name}:</strong> High: {comparison.categoryComparisons.signals.a.high},
              Medium: {comparison.categoryComparisons.signals.a.medium}, Low:{" "}
              {comparison.categoryComparisons.signals.a.low}, Last 30 days:{" "}
              {comparison.categoryComparisons.signals.a.last30}
            </p>
            <p>
              <strong>{comparison.systemB.name}:</strong> High: {comparison.categoryComparisons.signals.b.high},
              Medium: {comparison.categoryComparisons.signals.b.medium}, Low:{" "}
              {comparison.categoryComparisons.signals.b.low}, Last 30 days:{" "}
              {comparison.categoryComparisons.signals.b.last30}
            </p>
            {comparison.categoryComparisons.signals.narrative !== "pending_generation" && (
              <p>{comparison.categoryComparisons.signals.narrative}</p>
            )}
          </div>

          <h3>Technology</h3>
          <div style={{ marginBottom: "1rem" }}>
            <p>
              <strong>{comparison.systemA.name}:</strong> {comparison.categoryComparisons.technology.a.length}{" "}
              technologies
            </p>
            <p>
              <strong>{comparison.systemB.name}:</strong> {comparison.categoryComparisons.technology.b.length}{" "}
              technologies
            </p>
            {comparison.categoryComparisons.technology.overlap.length > 0 && (
              <p>
                <strong>Overlap:</strong> {comparison.categoryComparisons.technology.overlap.join(", ")}
              </p>
            )}
            {comparison.categoryComparisons.technology.uniqueA.length > 0 && (
              <p>
                <strong>{comparison.systemA.name} unique:</strong>{" "}
                {comparison.categoryComparisons.technology.uniqueA.join(", ")}
              </p>
            )}
            {comparison.categoryComparisons.technology.uniqueB.length > 0 && (
              <p>
                <strong>{comparison.systemB.name} unique:</strong>{" "}
                {comparison.categoryComparisons.technology.uniqueB.join(", ")}
              </p>
            )}
            {comparison.categoryComparisons.technology.narrative !== "pending_generation" && (
              <p>{comparison.categoryComparisons.technology.narrative}</p>
            )}
          </div>

          <h3>Opportunities</h3>
          <div style={{ marginBottom: "1rem" }}>
            <p>
              <strong>{comparison.systemA.name}:</strong> Open: {comparison.categoryComparisons.opportunities.aOpen},
              In Progress: {comparison.categoryComparisons.opportunities.aProgress}
            </p>
            <p>
              <strong>{comparison.systemB.name}:</strong> Open: {comparison.categoryComparisons.opportunities.bOpen},
              In Progress: {comparison.categoryComparisons.opportunities.bProgress}
            </p>
            {comparison.categoryComparisons.opportunities.narrative !== "pending_generation" && (
              <p>{comparison.categoryComparisons.opportunities.narrative}</p>
            )}
          </div>

          <h3>Interactions</h3>
          <div style={{ marginBottom: "1rem" }}>
            <p>
              <strong>{comparison.systemA.name}:</strong> Last 14 days:{" "}
              {comparison.categoryComparisons.interactions.last14A}, Last 60 days:{" "}
              {comparison.categoryComparisons.interactions.last60A}
            </p>
            <p>
              <strong>{comparison.systemB.name}:</strong> Last 14 days:{" "}
              {comparison.categoryComparisons.interactions.last14B}, Last 60 days:{" "}
              {comparison.categoryComparisons.interactions.last60B}
            </p>
            {comparison.categoryComparisons.interactions.narrative !== "pending_generation" && (
              <p>{comparison.categoryComparisons.interactions.narrative}</p>
            )}
          </div>

          <h3>Contacts</h3>
          <div style={{ marginBottom: "1rem" }}>
            <p>
              <strong>{comparison.systemA.name}:</strong> Executives: {comparison.categoryComparisons.contacts.aExecs},
              Champions/Decision Makers: {comparison.categoryComparisons.contacts.aChampions}
            </p>
            <p>
              <strong>{comparison.systemB.name}:</strong> Executives: {comparison.categoryComparisons.contacts.bExecs},
              Champions/Decision Makers: {comparison.categoryComparisons.contacts.bChampions}
            </p>
            {comparison.categoryComparisons.contacts.narrative !== "pending_generation" && (
              <p>{comparison.categoryComparisons.contacts.narrative}</p>
            )}
          </div>

          <h3>Health Comparison</h3>
          <div style={{ marginBottom: "1rem" }}>
            <p>
              <strong>{comparison.systemA.name}:</strong> Score: {comparison.healthComparison.scoreA}, Band:{" "}
              {comparison.healthComparison.bandA}
            </p>
            <p>
              <strong>{comparison.systemB.name}:</strong> Score: {comparison.healthComparison.scoreB}, Band:{" "}
              {comparison.healthComparison.bandB}
            </p>
            {comparison.healthComparison.narrative !== "pending_generation" && (
              <p>{comparison.healthComparison.narrative}</p>
            )}
          </div>

          <h3>Final Insights</h3>
          <ul>
            {comparison.finalInsights
              .filter((insight) => insight !== "pending_generation")
              .map((insight, idx) => (
                <li key={idx}>{insight}</li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
