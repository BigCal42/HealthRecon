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
      const res = await fetch(`/api/systems/${slug}/run-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setStatus(`Error: ${data.error?.message ?? "Pipeline failed"}`);
        return;
      }

      const ingestCount = data.data?.ingest?.created ?? 0;
      const processedCount = data.data?.process?.processed ?? 0;
      const hasError = data.data?.error !== undefined;

      setStatus(
        hasError
          ? `Pipeline completed with errors: created ${ingestCount} docs, processed ${processedCount} docs`
          : `Pipeline done: created ${ingestCount} docs, processed ${processedCount} docs`,
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

      if (!res.ok || data.ok === false) {
        setStatus(`Error: ${data.error?.message ?? "Briefing generation failed"}`);
        return;
      }

      if (data.data?.created) {
        setStatus(`Briefing created successfully`);
      } else {
        setStatus(`Briefing not created (${data.data?.reason ?? "unknown reason"})`);
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

      if (!res.ok || data.ok === false) {
        setStatus(`Error: ${data.error?.message ?? "News ingest failed"}`);
        return;
      }

      setStatus(
        `News ingest done: ${data.data?.documents_created ?? 0} documents created from ${data.data?.sources ?? 0} sources`,
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

      if (!res.ok || data.ok === false) {
        setStatus(`Failed to generate profile: ${data.error?.message ?? "Unknown error"}`);
        return;
      }

      setStatus("Profile generated successfully.");
    } catch (error) {
      setStatus("Failed to generate profile.");
    } finally {
      setLoading(false);
    }
  };

  const generateOutboundPlaybook = async () => {
    setLoading(true);
    setStatus("Generating outbound playbook...");
    try {
      const res = await fetch("/api/outbound-playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setStatus(`Failed to generate playbook: ${data.error?.message ?? "Unknown error"}`);
        return;
      }

      setStatus("Outbound playbook generated successfully.");
    } catch (error) {
      setStatus("Failed to generate playbook.");
    } finally {
      setLoading(false);
    }
  };

  const generateOutboundEmail = async () => {
    setLoading(true);
    setStatus("Generating outbound email...");
    try {
      const res = await fetch("/api/outbound-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, kind: "email" }),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setStatus(`Failed to generate email draft: ${data.error?.message ?? "Unknown error"}`);
        return;
      }

      setStatus("Outbound email draft generated successfully.");
    } catch (error) {
      setStatus("Failed to generate email draft.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={handleRunPipeline}
          disabled={loading}
          className="rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-sm font-medium transition-all hover:bg-muted/40 hover:border-border active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Run Pipeline
        </button>
        <button
          onClick={handleGenerateBriefing}
          disabled={loading}
          className="rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-sm font-medium transition-all hover:bg-muted/40 hover:border-border active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Daily Briefing
        </button>
        <button
          onClick={handleNewsIngest}
          disabled={loading}
          className="rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-sm font-medium transition-all hover:bg-muted/40 hover:border-border active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Run News Ingest
        </button>
        <button
          onClick={generateProfile}
          disabled={loading}
          className="rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-sm font-medium transition-all hover:bg-muted/40 hover:border-border active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Profile
        </button>
        <button
          onClick={generateOutboundPlaybook}
          disabled={loading}
          className="rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-sm font-medium transition-all hover:bg-muted/40 hover:border-border active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Outbound Playbook
        </button>
        <button
          onClick={generateOutboundEmail}
          disabled={loading}
          className="rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-sm font-medium transition-all hover:bg-muted/40 hover:border-border active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Outbound Email
        </button>
      </div>
      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {!loading && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  );
}

