"use client";

import { useState } from "react";

interface AdminSystemsClientProps {
  initialSystems: {
    id: string;
    slug: string;
    name: string;
    website?: string | null;
  }[];
}

export function AdminSystemsClient({ initialSystems }: AdminSystemsClientProps) {
  const [systems, setSystems] = useState(initialSystems);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [hqCity, setHqCity] = useState("");
  const [hqState, setHqState] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!slug.trim() || !name.trim()) {
      setError("Slug and name are required");
      return;
    }

    setStatus("Adding system...");
    setError(null);

    try {
      const res = await fetch("/api/admin/systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim(),
          name: name.trim(),
          website: website.trim() || undefined,
          hqCity: hqCity.trim() || undefined,
          hqState: hqState.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        const errorMsg =
          data.error === "slug_already_exists"
            ? "A system with this slug already exists"
            : data.error ?? "Failed to add system";
        setError(errorMsg);
        setStatus(null);
        return;
      }

      // Add new system to state (we'll need to refresh to get the full data)
      // For now, just add a placeholder
      setSystems([
        ...systems,
        {
          id: `temp-${Date.now()}`,
          slug: slug.trim(),
          name: name.trim(),
          website: website.trim() || null,
        },
      ]);

      // Clear form
      setSlug("");
      setName("");
      setWebsite("");
      setHqCity("");
      setHqState("");
      setStatus("System added successfully!");
      
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
            Slug:{" "}
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              style={{ width: "200px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Name:{" "}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: "300px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Website:{" "}
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              style={{ width: "400px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            HQ City:{" "}
            <input
              type="text"
              value={hqCity}
              onChange={(e) => setHqCity(e.target.value)}
              style={{ width: "200px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            HQ State:{" "}
            <input
              type="text"
              value={hqState}
              onChange={(e) => setHqState(e.target.value)}
              style={{ width: "100px" }}
            />
          </label>
        </div>
        <button type="submit" disabled={!!status && status !== "System added successfully!"}>
          Add System
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

