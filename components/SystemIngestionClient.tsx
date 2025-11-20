"use client";

import { useState } from "react";
import type { SystemIngestionConfig, SystemSeed } from "@/lib/getSystemIngestionConfig";

interface Props {
  config: SystemIngestionConfig;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return "—";
  }
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch {
    return "—";
  }
}

export function SystemIngestionClient({ config }: Props) {
  const [seeds, setSeeds] = useState<SystemSeed[]>(config.seeds);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function addSeed(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const url = String(formData.get("url") || "").trim();
    const label = String(formData.get("label") || "").trim() || null;
    const priorityStr = String(formData.get("priority") || "").trim();
    const priority = priorityStr ? Number(priorityStr) : null;

    if (!url) return;

    try {
      setPending(true);
      setStatusMessage(null);

      const res = await fetch(`/api/systems/${config.slug}/seeds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          label,
          priority,
          isActive: true,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        setStatusMessage("Failed to add seed.");
        return;
      }

      const newSeed = json.data as SystemSeed;
      setSeeds((prev) => [...prev, newSeed]);
      setStatusMessage("Seed added.");
      e.currentTarget.reset();
    } catch {
      setStatusMessage("Error adding seed.");
    } finally {
      setPending(false);
    }
  }

  async function updateSeed(seedId: string, updates: Partial<SystemSeed>) {
    try {
      setPending(true);
      setStatusMessage(null);

      const res = await fetch(`/api/system-seeds/${seedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        setStatusMessage("Failed to update seed.");
        return;
      }

      const updated = json.data as SystemSeed;
      setSeeds((prev) => prev.map((s) => (s.id === seedId ? updated : s)));
      setStatusMessage("Seed updated.");
    } catch {
      setStatusMessage("Error updating seed.");
    } finally {
      setPending(false);
    }
  }

  async function deleteSeed(seedId: string) {
    try {
      setPending(true);
      setStatusMessage(null);

      const res = await fetch(`/api/system-seeds/${seedId}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        setStatusMessage("Failed to delete seed.");
        return;
      }

      setSeeds((prev) => prev.filter((s) => s.id !== seedId));
      setStatusMessage("Seed deleted.");
    } catch {
      setStatusMessage("Error deleting seed.");
    } finally {
      setPending(false);
    }
  }

  async function runPipeline() {
    try {
      setPending(true);
      setStatusMessage("Running pipeline...");

      const res = await fetch(`/api/systems/${config.slug}/run-pipeline`, {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        setStatusMessage("Pipeline failed or returned an error.");
        return;
      }

      setStatusMessage("Pipeline completed.");
    } catch {
      setStatusMessage("Error running pipeline.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {statusMessage && (
        <p style={{ padding: "0.5rem", backgroundColor: "#f0f0f0", marginBottom: "1rem" }}>
          {statusMessage}
        </p>
      )}

      <section style={{ marginBottom: "2rem" }}>
        <h2>Seeds</h2>
        {seeds.length === 0 ? (
          <p>No seeds configured.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ccc" }}>
                  URL
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ccc" }}>
                  Label
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ccc" }}>
                  Priority
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ccc" }}>
                  Active
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ccc" }}>
                  Last Crawled
                </th>
                <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ccc" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {seeds.map((seed) => (
                <tr key={seed.id}>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    <a href={seed.url} target="_blank" rel="noopener noreferrer">
                      {seed.url}
                    </a>
                  </td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    {seed.label || "—"}
                  </td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    {seed.priority ?? "—"}
                  </td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    <input
                      type="checkbox"
                      checked={seed.isActive}
                      onChange={(e) =>
                        updateSeed(seed.id, { isActive: e.target.checked })
                      }
                      disabled={pending}
                    />
                  </td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    {formatDate(seed.lastCrawledAt)}
                  </td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    <button
                      onClick={() => deleteSeed(seed.id)}
                      disabled={pending}
                      style={{ padding: "0.25rem 0.5rem" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Add Seed</h2>
        <form onSubmit={addSeed} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "500px" }}>
          <div>
            <label>
              URL
              <input
                name="url"
                type="url"
                required
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              />
            </label>
          </div>
          <div>
            <label>
              Label
              <input
                name="label"
                type="text"
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              />
            </label>
          </div>
          <div>
            <label>
              Priority
              <input
                name="priority"
                type="number"
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            style={{ padding: "0.5rem 1rem", marginTop: "0.5rem", maxWidth: "200px" }}
          >
            {pending ? "Saving..." : "Add Seed"}
          </button>
        </form>
      </section>

      <section>
        <h2>Run Ingestion Pipeline</h2>
        <p>
          Run Firecrawl-based ingestion and analysis for <strong>{config.name}</strong>.
        </p>
        <button
          onClick={runPipeline}
          disabled={pending}
          style={{ padding: "0.5rem 1rem" }}
        >
          {pending ? "Running..." : "Run Pipeline"}
        </button>
      </section>
    </div>
  );
}

