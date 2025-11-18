"use client";

import { useState } from "react";

import type { SearchResultItem } from "@/lib/search";

export function GlobalSearchClient() {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const runSearch = async () => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    setStatus("Searching...");

    try {
      const res = await fetch(
        "/api/search?q=" + encodeURIComponent(query),
      );
      const data = await res.json();

      if (!res.ok) {
        setError("Search failed.");
        setStatus(null);
        return;
      }

      setResults(data.results ?? []);
      setStatus("Done.");
    } catch (err) {
      setError("Search failed.");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search systems, docs, signals, opportunities, interactions, contacts..."
          style={{ width: "100%", maxWidth: "600px", padding: "0.5rem" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ marginLeft: "0.5rem", padding: "0.5rem 1rem" }}
        >
          Search
        </button>
      </form>

      {loading && <p>Loading...</p>}
      {status && <p>{status}</p>}
      {error && <p style={{ color: "#d32f2f" }}>{error}</p>}
      {results.length === 0 && !loading && !error && query.trim() !== "" && (
        <p>No results found.</p>
      )}
      {results.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, marginTop: "2rem" }}>
          {results.map((r, i) => (
            <li
              key={r.type + ":" + r.id + ":" + i}
              style={{
                border: "1px solid #ddd",
                padding: "1rem",
                marginBottom: "1rem",
                borderRadius: "4px",
              }}
            >
              <p>
                <strong>{r.type}</strong>
                {r.systemSlug && (
                  <>
                    {" – "}
                    <a href={`/systems/${r.systemSlug}`}>{r.systemName}</a>
                  </>
                )}
              </p>
              <p>
                <strong>{r.title}</strong>
              </p>
              {r.snippet && (
                <p style={{ color: "#666", fontSize: "0.9em" }}>{r.snippet}</p>
              )}
              {r.timestamp && (
                <p style={{ color: "#999", fontSize: "0.8em" }}>
                  {new Date(r.timestamp).toLocaleString()}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

