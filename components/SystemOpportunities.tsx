"use client";

import { useState, useEffect, useCallback } from "react";

interface SystemOpportunitiesProps {
  slug: string;
}

type Opportunity = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
};

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function SystemOpportunities({ slug }: SystemOpportunitiesProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load opportunities");
        return;
      }

      setOpportunities(data.opportunities ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title: title.trim(),
          description: description.trim() || undefined,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to create opportunity");
        return;
      }

      setTitle("");
      setDescription("");
      setStatus("open");
      await fetchOpportunities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Title:{" "}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ width: "300px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Description:{" "}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: "300px", height: "60px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Status:{" "}
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </div>
        <button type="submit" disabled={loading}>
          Add Opportunity
        </button>
      </form>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <div>
        <h3>Opportunities</h3>
        {loading && opportunities.length === 0 ? (
          <p>Loading...</p>
        ) : opportunities.length === 0 ? (
          <p>No opportunities yet.</p>
        ) : (
          <ul>
            {opportunities.map((opp) => (
              <li key={opp.id} style={{ marginBottom: "0.5rem" }}>
                <strong>{opp.title}</strong> – {formatStatus(opp.status)} –{" "}
                {opp.created_at
                  ? new Date(opp.created_at).toLocaleString()
                  : "Unknown"}
                {opp.description && (
                  <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
                    {opp.description.split("\n")[0]}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

