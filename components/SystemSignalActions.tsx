"use client";

import { useState, useEffect } from "react";

interface SystemSignalActionsProps {
  slug: string;
  signals: Array<{
    id: string;
    category: string | null;
    summary: string | null;
  }>;
}

type SignalAction = {
  id: string;
  system_id: string;
  signal_id: string;
  action_category: string;
  action_description: string;
  confidence: number;
  created_at: string;
};

export function SystemSignalActions({ slug, signals }: SystemSignalActionsProps) {
  const [actions, setActions] = useState<SignalAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedSignalId, setSelectedSignalId] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchActions = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/signal-actions?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Failed to load actions");
          return;
        }

        setActions(data.signal_actions ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchActions();
  }, [slug]);

  const handleGenerate = async () => {
    if (!selectedSignalId) {
      setError("Please select a signal");
      return;
    }

    setGenerating(true);
    setStatus("Generating actions...");
    setError(null);

    try {
      const res = await fetch("/api/signal-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          signalId: selectedSignalId,
          mode: "generate",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setStatus("Failed to generate actions.");
        setError("Failed to generate actions.");
        return;
      }

      // Append newly created actions to state
      setActions((prev) => [...(data.actions ?? []), ...prev]);
      setStatus("Actions generated successfully.");
      setSelectedSignalId(""); // Reset selection
    } catch (err) {
      setStatus("Failed to generate actions.");
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  };

  if (loading && actions.length === 0) {
    return <p>Loading signal actions...</p>;
  }

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <label htmlFor="signal-select" style={{ display: "block", marginBottom: "0.25rem" }}>
            Select a signal:
          </label>
          <select
            id="signal-select"
            value={selectedSignalId}
            onChange={(e) => setSelectedSignalId(e.target.value)}
            style={{ width: "100%", maxWidth: "600px", padding: "0.5rem" }}
          >
            <option value="">Select a signal…</option>
            {signals.map((s) => (
              <option key={s.id} value={s.id}>
                {s.category ?? "unknown"} — {(s.summary ?? "").slice(0, 80)}
                {(s.summary ?? "").length > 80 ? "..." : ""}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || !selectedSignalId}
          style={{ padding: "0.5rem 1rem", marginTop: "0.5rem" }}
        >
          {generating ? "Generating..." : "Generate Actions for This Signal"}
        </button>
      </div>

      {status && (
        <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "0.5rem" }}>{status}</p>
      )}

      {error && (
        <p style={{ color: "red", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Error: {error}</p>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <h3>Recommended Actions</h3>
        {actions.length === 0 ? (
          <p>No actions generated yet.</p>
        ) : (
          <ul>
            {actions.map((a) => (
              <li key={a.id} style={{ marginBottom: "1rem", padding: "0.5rem", border: "1px solid #ddd" }}>
                <p>
                  <strong>{a.action_category}</strong> — confidence {a.confidence}
                </p>
                <p>{a.action_description}</p>
                <p style={{ color: "#666", fontSize: "0.9rem" }}>
                  {a.created_at ? new Date(a.created_at).toLocaleString() : "Unknown"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

