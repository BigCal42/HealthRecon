"use client";

import { useState, useEffect } from "react";
import type { AnalyticsData } from "@/lib/getAnalytics";

interface AnalyticsClientProps {
  initialData: AnalyticsData;
}

export function AnalyticsClient({ initialData }: AnalyticsClientProps) {
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const refreshData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/analytics");
      const result = (await response.json()) as
        | { ok: true; data: AnalyticsData }
        | { ok: false; error: { code: string; message: string } };

      if (result.ok) {
        setData(result.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to refresh analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <button
          onClick={refreshData}
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            backgroundColor: loading ? "#ccc" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
        <span style={{ color: "#666", fontSize: "0.9rem" }}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
        {/* OpenAI Usage */}
        <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>OpenAI Usage</h2>
          <div style={{ marginTop: "1rem" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Estimated Calls:</strong> {data.openai.estimatedCalls.toLocaleString()}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Estimated Cost:</strong> ${data.openai.estimatedCost.toFixed(2)}
            </div>
            <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#666" }}>
              <strong>Model Breakdown:</strong>
              <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
                {Object.entries(data.openai.modelBreakdown).map(([model, count]) => (
                  <li key={model}>
                    {model}: {count.toLocaleString()} calls
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Ingestion Stats */}
        <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Ingestion</h2>
          <div style={{ marginTop: "1rem" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Total Documents:</strong> {data.ingestion.totalDocuments.toLocaleString()}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Last 24h:</strong> {data.ingestion.documentsLast24h.toLocaleString()}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Systems Processed:</strong> {data.ingestion.systemsProcessed}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Avg Docs/System:</strong> {data.ingestion.averageDocumentsPerSystem.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Briefings Stats */}
        <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Briefings</h2>
          <div style={{ marginTop: "1rem" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Total Briefings:</strong> {data.briefings.totalBriefings.toLocaleString()}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Last 24h:</strong> {data.briefings.briefingsLast24h.toLocaleString()}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Success Rate:</strong> {data.briefings.successRate.toFixed(1)}%
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Systems with Briefings:</strong> {data.briefings.systemsWithBriefings}
            </div>
          </div>
        </div>

        {/* Systems Stats */}
        <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Systems</h2>
          <div style={{ marginTop: "1rem" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Total Systems:</strong> {data.systems.totalSystems}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>With Seeds:</strong> {data.systems.systemsWithSeeds}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>With Documents:</strong> {data.systems.systemsWithDocuments}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>With Signals:</strong> {data.systems.systemsWithSignals}
            </div>
          </div>
        </div>

        {/* Rate Limits */}
        <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Rate Limits</h2>
          <div style={{ marginTop: "1rem" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Total Requests:</strong> {data.rateLimits.totalRequests.toLocaleString()}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Rate Limit Hits:</strong> {data.rateLimits.rateLimitHits}
            </div>
            {data.rateLimits.topEndpoints.length > 0 && (
              <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#666" }}>
                <strong>Top Endpoints:</strong>
                <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
                  {data.rateLimits.topEndpoints.slice(0, 5).map((ep) => (
                    <li key={ep.endpoint}>
                      {ep.endpoint}: {ep.requests.toLocaleString()} requests
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Errors */}
        <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Errors</h2>
          <div style={{ marginTop: "1rem" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Total Errors:</strong> {data.errors.totalErrors.toLocaleString()}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Last 24h:</strong> {data.errors.errorsLast24h.toLocaleString()}
            </div>
            {data.errors.topErrorEndpoints.length > 0 && (
              <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#666" }}>
                <strong>Top Error Endpoints:</strong>
                <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
                  {data.errors.topErrorEndpoints.map((ep) => (
                    <li key={ep.endpoint}>
                      {ep.endpoint}: {ep.count} errors
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

