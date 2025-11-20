"use client";

import { useState } from "react";

interface SystemProfileClientProps {
  slug: string;
  initialProfile: {
    id: string;
    system_id: string;
    summary: {
      executive_summary: string;
      key_leadership: string[];
      strategic_priorities: string[];
      technology_landscape: string[];
      recent_signals: string[];
      opportunities_summary: string[];
      risk_factors: string[];
    };
    created_at: string;
  } | null;
}

export function SystemProfileClient({ slug, initialProfile }: SystemProfileClientProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/system-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error?.message ?? "Failed to generate profile");
        return;
      }

      // Re-fetch the latest profile
      const fetchRes = await fetch(`/api/system-profile?slug=${encodeURIComponent(slug)}`);
      const fetchData = await fetchRes.json();

      if (fetchRes.ok && fetchData.ok && fetchData.data?.profile) {
        setProfile(fetchData.data.profile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRegenerating(false);
    }
  };

  if (!profile) {
    return (
      <div>
        <p>No profile available.</p>
        <button onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? "Generating..." : "Generate Profile"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? "Regenerating..." : "Regenerate Profile"}
        </button>
        {profile.created_at && (
          <span style={{ marginLeft: "1rem", fontSize: "0.875rem", color: "#666" }}>
            Generated: {new Date(profile.created_at).toLocaleString()}
          </span>
        )}
      </div>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <div>
        <h3>Executive Summary</h3>
        <p>{profile.summary.executive_summary}</p>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h3>Key Leadership</h3>
        {profile.summary.key_leadership.length > 0 ? (
          <ul>
            {profile.summary.key_leadership.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No leadership information available.</p>
        )}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h3>Strategic Priorities</h3>
        {profile.summary.strategic_priorities.length > 0 ? (
          <ul>
            {profile.summary.strategic_priorities.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No strategic priorities available.</p>
        )}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h3>Technology Landscape</h3>
        {profile.summary.technology_landscape.length > 0 ? (
          <ul>
            {profile.summary.technology_landscape.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No technology information available.</p>
        )}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h3>Recent Signals</h3>
        {profile.summary.recent_signals.length > 0 ? (
          <ul>
            {profile.summary.recent_signals.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No recent signals available.</p>
        )}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h3>Opportunities Summary</h3>
        {profile.summary.opportunities_summary.length > 0 ? (
          <ul>
            {profile.summary.opportunities_summary.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No opportunities available.</p>
        )}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h3>Risk Factors</h3>
        {profile.summary.risk_factors.length > 0 ? (
          <ul>
            {profile.summary.risk_factors.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No risk factors identified.</p>
        )}
      </div>
    </div>
  );
}

