"use client";

import { useState, useEffect, useCallback } from "react";

interface SystemOutboundPrepProps {
  slug: string;
}

type OutboundPlaybook = {
  id: string;
  system_id: string;
  summary: {
    outbound_brief: string;
    call_talk_tracks: string[];
    email_openers: string[];
    next_actions: string[];
  };
  created_at: string;
};

export function SystemOutboundPrep({ slug }: SystemOutboundPrepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbook, setPlaybook] = useState<OutboundPlaybook | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const fetchPlaybook = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/outbound-playbook?slug=${encodeURIComponent(slug)}`,
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load playbook");
        return;
      }

      setPlaybook(data.playbook);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchPlaybook();
  }, [fetchPlaybook]);

  const handleGenerate = async () => {
    setRegenerating(true);
    setStatus("Generating playbook...");
    setError(null);
    try {
      const res = await fetch("/api/outbound-playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setStatus("Failed to generate playbook.");
        setError(data.error ?? "Failed to generate playbook");
        return;
      }

      setStatus("Playbook updated.");
      await fetchPlaybook();
    } catch (err) {
      setStatus("Failed to generate playbook.");
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading && !playbook) {
    return <p>Loading outbound prep...</p>;
  }

  if (error && !playbook) {
    return (
      <div>
        <p style={{ color: "red" }}>Error: {error}</p>
        <button onClick={handleGenerate} disabled={regenerating}>
          {regenerating ? "Generating..." : "Generate Playbook"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={handleGenerate} disabled={regenerating || loading}>
          {regenerating ? "Generating..." : playbook ? "Regenerate Playbook" : "Generate Playbook"}
        </button>
        {playbook?.created_at && (
          <span style={{ marginLeft: "1rem", fontSize: "0.875rem", color: "#666" }}>
            Generated: {new Date(playbook.created_at).toLocaleString()}
          </span>
        )}
      </div>

      {status && (
        <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1rem" }}>
          {status}
        </p>
      )}

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {!playbook ? (
        <p>No outbound playbook yet.</p>
      ) : (
        <>
          <div style={{ marginTop: "1.5rem" }}>
            <h3>Outbound Brief</h3>
            <p>{playbook.summary.outbound_brief}</p>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h3>Call Talk Tracks</h3>
            {playbook.summary.call_talk_tracks &&
            playbook.summary.call_talk_tracks.length > 0 ? (
              <ul>
                {playbook.summary.call_talk_tracks.map((track, i) => (
                  <li key={i}>{track}</li>
                ))}
              </ul>
            ) : (
              <p>No talk tracks available.</p>
            )}
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h3>Email Openers</h3>
            {playbook.summary.email_openers &&
            playbook.summary.email_openers.length > 0 ? (
              <ul>
                {playbook.summary.email_openers.map((opener, i) => (
                  <li key={i}>{opener}</li>
                ))}
              </ul>
            ) : (
              <p>No email openers available.</p>
            )}
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h3>Next Actions</h3>
            {playbook.summary.next_actions &&
            playbook.summary.next_actions.length > 0 ? (
              <ul>
                {playbook.summary.next_actions.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            ) : (
              <p>No next actions available.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

