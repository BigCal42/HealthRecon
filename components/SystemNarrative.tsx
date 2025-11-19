"use client";

import { useState, useEffect, useCallback } from "react";

interface SystemNarrativeProps {
  slug: string;
}

type SystemNarrative = {
  id: string;
  system_id: string;
  narrative: {
    headline: string;
    narrative_summary: string[];
    strategic_themes: string[];
    business_implications: string[];
    recommended_focus: string[];
    risks: string[];
    momentum_signals: string[];
  };
  created_at: string;
};

export function SystemNarrative({ slug }: SystemNarrativeProps) {
  const [narrative, setNarrative] = useState<SystemNarrative | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNarrative = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/system-narrative?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load narrative");
        return;
      }

      setNarrative(data.narrative);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchNarrative();
  }, [fetchNarrative]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/system-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, mode: "generate" }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to generate narrative");
        return;
      }

      // Re-fetch the latest narrative
      await fetchNarrative();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  };

  if (loading && !narrative) {
    return <p>Loading narrative...</p>;
  }

  if (error && !narrative) {
    return (
      <div>
        <p style={{ color: "red" }}>Error: {error}</p>
        <button onClick={handleGenerate} disabled={generating}>
          {generating ? "Generating..." : "Generate Narrative"}
        </button>
      </div>
    );
  }

  if (!narrative) {
    return (
      <div>
        <p>Generate a narrative to get started.</p>
        <button onClick={handleGenerate} disabled={generating}>
          {generating ? "Generating..." : "Generate Narrative"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={handleGenerate} disabled={generating}>
          {generating ? "Generating..." : "Generate New Narrative"}
        </button>
        <button
          onClick={fetchNarrative}
          disabled={loading}
          style={{ marginLeft: "0.5rem" }}
        >
          Refresh
        </button>
        {narrative.created_at && (
          <span style={{ marginLeft: "1rem", fontSize: "0.875rem", color: "#666" }}>
            Generated: {new Date(narrative.created_at).toLocaleString()}
          </span>
        )}
      </div>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <div>
        <h3>{narrative.narrative.headline}</h3>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h4>Narrative Summary</h4>
        {narrative.narrative.narrative_summary.length > 0 ? (
          <ul>
            {narrative.narrative.narrative_summary.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No summary available.</p>
        )}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h4>Strategic Themes</h4>
        {narrative.narrative.strategic_themes.length > 0 ? (
          <ul>
            {narrative.narrative.strategic_themes.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No strategic themes identified.</p>
        )}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h4>Business Implications</h4>
        {narrative.narrative.business_implications.length > 0 ? (
          <ul>
            {narrative.narrative.business_implications.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No business implications identified.</p>
        )}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h4>Recommended Focus</h4>
        {narrative.narrative.recommended_focus.length > 0 ? (
          <ul>
            {narrative.narrative.recommended_focus.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No recommendations available.</p>
        )}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h4>Risks</h4>
        {narrative.narrative.risks.length > 0 ? (
          <ul>
            {narrative.narrative.risks.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No risks identified.</p>
        )}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h4>Momentum Signals</h4>
        {narrative.narrative.momentum_signals.length > 0 ? (
          <ul>
            {narrative.narrative.momentum_signals.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No momentum signals identified.</p>
        )}
      </div>
    </div>
  );
}

