"use client";

import { useEffect, useState } from "react";

export function SalesBriefingClient() {
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<any | null>(null);

  useEffect(() => {
    // Fetch latest briefing on mount
    loadBriefing("");
  }, []);

  const loadBriefing = async (targetDate: string) => {
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const url = targetDate
        ? `/api/sales-briefing?date=${encodeURIComponent(targetDate)}`
        : "/api/sales-briefing";

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load briefing");
        setBriefing(null);
        return;
      }

      setBriefing(data.briefing);
      if (data.briefing?.generated_for_date) {
        setDate(data.briefing.generated_for_date);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setBriefing(null);
    } finally {
      setLoading(false);
    }
  };

  const generateYesterday = async () => {
    setLoading(true);
    setError(null);
    setStatus("Generating briefing...");

    try {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const iso = d.toISOString().slice(0, 10);

      const res = await fetch("/api/sales-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: iso }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to generate briefing");
        setStatus(null);
        return;
      }

      setBriefing(data.briefing);
      if (data.briefing?.generated_for_date) {
        setDate(data.briefing.generated_for_date);
      }
      setStatus("Briefing generated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h2>Controls</h2>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <label>
            Date:
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ marginLeft: "0.5rem", padding: "0.25rem" }}
            />
          </label>
          <button
            onClick={() => loadBriefing(date)}
            disabled={loading}
            style={{ padding: "0.5rem 1rem" }}
          >
            Load Briefing
          </button>
          <button
            onClick={generateYesterday}
            disabled={loading}
            style={{ padding: "0.5rem 1rem" }}
          >
            Generate Briefing for Yesterday
          </button>
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {status && <p style={{ color: "green" }}>{status}</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {briefing ? (
        <div>
          <h2>
            {briefing.summary?.date_label ?? "Sales Briefing"} (
            {briefing.generated_for_date})
          </h2>

          <h3>Headline</h3>
          <p>{briefing.summary?.headline}</p>

          <h3>Portfolio Summary</h3>
          <ul>
            {briefing.summary?.portfolio_summary?.map(
              (b: string, i: number) => <li key={i}>{b}</li>,
            )}
          </ul>

          <h3>Suggested Focus for Today</h3>
          <ul>
            {briefing.summary?.suggested_todays_focus?.map(
              (b: string, i: number) => <li key={i}>{b}</li>,
            )}
          </ul>

          <h3>Systems</h3>
          {briefing.summary?.system_summaries?.map(
            (s: any, i: number) => (
              <div key={i} style={{ marginBottom: "2rem" }}>
                <h4>
                  {s.system_name}{" "}
                  {s.system_slug && (
                    <>
                      –{" "}
                      <a href={`/systems/${s.system_slug}`}>
                        /systems/{s.system_slug}
                      </a>
                    </>
                  )}
                </h4>
                <p>Key points:</p>
                <ul>
                  {s.key_points?.map((p: string, j: number) => (
                    <li key={j}>{p}</li>
                  ))}
                </ul>
                <p>Suggested focus:</p>
                <ul>
                  {s.suggested_focus?.map((p: string, j: number) => (
                    <li key={j}>{p}</li>
                  ))}
                </ul>
              </div>
            ),
          )}

          <h3>Risks / Watch Items</h3>
          <ul>
            {briefing.summary?.risks_or_watch_items?.map(
              (b: string, i: number) => <li key={i}>{b}</li>,
            )}
          </ul>
        </div>
      ) : !loading && !error ? (
        <p>No briefing available. Generate one to get started.</p>
      ) : null}
    </div>
  );
}

