"use client";

import { useCallback, useEffect, useState } from "react";

interface SystemOpportunitySuggestionsProps {
  slug: string;
}

type Suggestion = {
  id: string;
  title: string;
  description: string | null;
  source_kind: string;
  accepted: boolean;
};

export function SystemOpportunitySuggestions({ slug }: SystemOpportunitySuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(
        `/api/opportunity-suggestions?slug=${encodeURIComponent(slug)}`,
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load suggestions");
        return;
      }

      setSuggestions(data.suggestions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/opportunity-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to generate suggestions");
        return;
      }

      setStatusMessage(`Generated ${data.created ?? 0} suggestions.`);
      await fetchSuggestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const acceptSuggestion = async (suggestionId: string) => {
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/opportunity-suggestions/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, suggestionId }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to convert suggestion");
        return;
      }

      setStatusMessage("Opportunity created.");
      setSuggestions((prev) =>
        prev.map((suggestion) =>
          suggestion.id === suggestionId
            ? { ...suggestion, accepted: true }
            : suggestion,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading} style={{ marginBottom: "1rem" }}>
        Generate Suggestions
      </button>

      {statusMessage && <p style={{ color: "green" }}>{statusMessage}</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {loading && suggestions.length === 0 ? (
        <p>Loading...</p>
      ) : suggestions.length === 0 ? (
        <p>No suggestions yet.</p>
      ) : (
        <ul>
          {suggestions.map((suggestion) => (
            <li key={suggestion.id} style={{ marginBottom: "1rem" }}>
              <strong>{suggestion.title}</strong> [{suggestion.source_kind}]
              {suggestion.accepted ? " (accepted)" : ""}
              {suggestion.description && <p>{suggestion.description}</p>}
              {!suggestion.accepted && (
                <button onClick={() => acceptSuggestion(suggestion.id)} disabled={loading}>
                  Convert to Opportunity
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

