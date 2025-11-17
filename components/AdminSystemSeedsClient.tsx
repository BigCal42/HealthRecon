"use client";

import { useState } from "react";

interface AdminSystemSeedsClientProps {
  slug: string;
  initialSeeds: {
    id: string;
    url: string;
    active: boolean;
    created_at: string;
  }[];
}

export function AdminSystemSeedsClient({
  slug,
  initialSeeds,
}: AdminSystemSeedsClientProps) {
  const [seeds, setSeeds] = useState(initialSeeds);
  const [url, setUrl] = useState("");
  const [active, setActive] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError("URL is required");
      return;
    }

    setStatus("Adding seed...");
    setError(null);

    try {
      const res = await fetch("/api/admin/system-seeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          url: url.trim(),
          active,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to add seed");
        setStatus(null);
        return;
      }

      // Add new seed to state (we'll refresh to get the full data)
      setSeeds([
        {
          id: `temp-${Date.now()}`,
          url: url.trim(),
          active,
          created_at: new Date().toISOString(),
        },
        ...seeds,
      ]);

      // Clear form
      setUrl("");
      setActive(true);
      setStatus("Seed added successfully!");

      // Refresh page after a short delay to show updated list
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus(null);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            URL:{" "}
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              style={{ width: "500px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />{" "}
            Active
          </label>
        </div>
        <button type="submit" disabled={!!status && status !== "Seed added successfully!"}>
          Add Seed
        </button>
      </form>

      {error && <p style={{ color: "red", marginTop: "0.5rem" }}>Error: {error}</p>}
      {status && (
        <p style={{ color: status.includes("successfully") ? "green" : "#666", marginTop: "0.5rem" }}>
          {status}
        </p>
      )}
    </div>
  );
}

