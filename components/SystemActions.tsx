"use client";

import { useState } from "react";

interface SystemActionsProps {
  slug: string;
}

export function SystemActions({ slug }: SystemActionsProps) {
  const [status, setStatus] = useState<string>("Idle");
  const [loading, setLoading] = useState<boolean>(false);

  const handleRunPipeline = async () => {
    setLoading(true);
    setStatus("Running...");
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(`Error: ${data.error ?? "Pipeline failed"}`);
        return;
      }

      const ingestCount = Array.isArray(data.ingest?.created)
        ? data.ingest.created.length
        : data.ingest?.created ?? 0;
      const processedCount = data.process?.processed ?? 0;

      setStatus(
        `Pipeline done: created ${ingestCount} docs, processed ${processedCount} docs`,
      );
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBriefing = async () => {
    setLoading(true);
    setStatus("Running...");
    try {
      const res = await fetch("/api/daily-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(`Error: ${data.error ?? "Briefing generation failed"}`);
        return;
      }

      if (data.created) {
        setStatus(`Briefing created: true`);
      } else {
        setStatus(`Briefing created: false (${data.reason ?? "unknown reason"})`);
      }
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNewsIngest = async () => {
    setLoading(true);
    setStatus("Running...");
    try {
      const res = await fetch("/api/news-ingest", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(`Error: ${data.error ?? "News ingest failed"}`);
        return;
      }

      setStatus(
        `News ingest done: ${data.documents_created ?? 0} documents created from ${data.sources ?? 0} sources`,
      );
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const generateProfile = async () => {
    setLoading(true);
    setStatus("Generating profile...");
    try {
      const res = await fetch("/api/system-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setStatus("Failed to generate profile.");
        return;
      }

      setStatus("Profile generated.");
    } catch (error) {
      setStatus("Failed to generate profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>Actions</h2>
      <div style={{ marginBottom: "0.5rem" }}>
        <button onClick={handleRunPipeline} disabled={loading} style={{ marginRight: "0.5rem" }}>
          Run Pipeline
        </button>
        <button onClick={handleGenerateBriefing} disabled={loading} style={{ marginRight: "0.5rem" }}>
          Generate Daily Briefing
        </button>
        <button onClick={handleNewsIngest} disabled={loading} style={{ marginRight: "0.5rem" }}>
          Run News Ingest
        </button>
        <button onClick={generateProfile} disabled={loading}>Generate Profile</button>
      </div>
      {loading && <p style={{ fontSize: "0.875rem", color: "#666" }}>Loading...</p>}
      {!loading && <p style={{ fontSize: "0.875rem", color: "#666" }}>{status}</p>}
    </div>
  );
}

