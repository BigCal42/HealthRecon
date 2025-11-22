"use client";

import { useState } from "react";

type PipelineRun = {
  id: string;
  status: string;
  ingest_created: number;
  process_processed: number;
  error_message: string | null;
  created_at: string | null;
};

interface Props {
  systemSlug: string;
  systemName: string;
  recentRuns: PipelineRun[];
}

function formatDate(dateString: string | null): string {
  if (!dateString) {
    return "Unknown";
  }
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch {
    return "Unknown";
  }
}

function getStatusBadgeColor(status: string): string {
  switch (status.toLowerCase()) {
    case "success":
      return "bg-green-500/20 text-green-700 dark:text-green-400";
    case "error":
      return "bg-red-500/20 text-red-700 dark:text-red-400";
    case "running":
    case "queued":
      return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function SystemPipelinePanel({ systemSlug, systemName, recentRuns }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  async function triggerPipeline() {
    setIsRunning(true);
    setLastResult(null);

    try {
      const res = await fetch(`/api/systems/${systemSlug}/run-pipeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        const errorMessage =
          json.error?.message || "Pipeline failed. Check the run history for details.";
        setLastResult({
          success: false,
          message: errorMessage,
        });
        return;
      }

      const data = json.data;
      const ingestCount = data.ingest?.created ?? 0;
      const processCount = data.process?.processed ?? 0;
      const hasError = data.error !== undefined;

      setLastResult({
        success: !hasError,
        message: hasError
          ? `Pipeline completed with errors. Ingested ${ingestCount} documents, processed ${processCount}.`
          : `Pipeline completed successfully. Ingested ${ingestCount} documents, processed ${processCount}.`,
      });

      // Refresh the page after a short delay to show the new run
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setLastResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to trigger pipeline.",
      });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Controls */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Pipeline Controls</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Run ingestion and processing for <strong>{systemName}</strong>. This will crawl seed URLs,
          extract entities and signals, and generate embeddings.
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={triggerPipeline}
            disabled={isRunning}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
          >
            {isRunning ? "Running..." : "Run Pipeline"}
          </button>
          {lastResult && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                lastResult.success
                  ? "bg-green-500/20 text-green-700 dark:text-green-400"
                  : "bg-red-500/20 text-red-700 dark:text-red-400"
              }`}
            >
              {lastResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Recent Pipeline Runs */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Recent Pipeline Runs</h3>
        {recentRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pipeline runs yet for this system. Click &quot;Run Pipeline&quot; to start ingestion.
          </p>
        ) : (
          <ul className="space-y-3">
            {recentRuns.map((run) => (
              <li
                key={run.id}
                className="rounded-lg border border-border/40 bg-background p-3 text-sm"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${getStatusBadgeColor(
                      run.status,
                    )}`}
                  >
                    {run.status}
                  </span>
                  <span className="text-muted-foreground">{formatDate(run.created_at)}</span>
                </div>
                <div className="text-muted-foreground">
                  Ingested: {run.ingest_created} documents | Processed: {run.process_processed}{" "}
                  documents
                </div>
                {run.error_message && (
                  <div className="mt-2 rounded bg-red-500/10 px-2 py-1 text-xs text-red-700 dark:text-red-400">
                    Error: {run.error_message}
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

