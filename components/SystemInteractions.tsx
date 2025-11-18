"use client";

import { useState, useEffect, useCallback } from "react";

interface SystemInteractionsProps {
  slug: string;
}

type Interaction = {
  id: string;
  occurred_at: string;
  channel: string;
  subject: string | null;
  summary: string | null;
  next_step: string | null;
  next_step_due_at: string | null;
};

export function SystemInteractions({ slug }: SystemInteractionsProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [occurredAt, setOccurredAt] = useState("");
  const [channel, setChannel] = useState("email");
  const [subject, setSubject] = useState("");
  const [summary, setSummary] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [nextStepDueAt, setNextStepDueAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const fetchInteractions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/interactions?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load interactions");
        return;
      }

      setInteractions(data.interactions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !summary.trim()) {
      setError("Subject and summary are required");
      return;
    }

    setLoading(true);
    setStatus("Saving interaction...");
    setError(null);

    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          occurredAt: occurredAt || undefined,
          channel,
          subject: subject.trim(),
          summary: summary.trim(),
          nextStep: nextStep.trim() || undefined,
          nextStepDueAt: nextStepDueAt || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to save interaction");
        setStatus(null);
        return;
      }

      // Clear form fields (except channel)
      setOccurredAt("");
      setSubject("");
      setSummary("");
      setNextStep("");
      setNextStepDueAt("");

      // Refresh interaction list
      await fetchInteractions();
      setStatus("Interaction saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save interaction");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Channel:{" "}
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="email">Email</option>
              <option value="call">Call</option>
              <option value="meeting">Meeting</option>
              <option value="linkedin">LinkedIn</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Subject:{" "}
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              style={{ width: "300px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Summary:{" "}
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              style={{ width: "300px", height: "60px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Occurred At (optional):{" "}
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              style={{ width: "300px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Next Step (optional):{" "}
            <textarea
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              style={{ width: "300px", height: "60px" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Next Step Due At (optional):{" "}
            <input
              type="datetime-local"
              value={nextStepDueAt}
              onChange={(e) => setNextStepDueAt(e.target.value)}
              style={{ width: "300px" }}
            />
          </label>
        </div>
        <button type="submit" disabled={loading}>
          Add Interaction
        </button>
      </form>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {status && <p style={{ color: "green" }}>{status}</p>}

      <div>
        <h3>Recent Interactions</h3>
        {loading && interactions.length === 0 ? (
          <p>Loading...</p>
        ) : interactions.length === 0 ? (
          <p>No interactions logged yet.</p>
        ) : (
          <ul>
            {interactions.map((i) => (
              <li key={i.id} style={{ marginBottom: "1rem" }}>
                <p>
                  <strong>{i.channel}</strong> – {i.subject ?? "(No subject)"}
                </p>
                <p>{i.summary}</p>
                <p>
                  Occurred: {i.occurred_at ? new Date(i.occurred_at).toLocaleString() : "Unknown"}
                  {i.next_step && (
                    <>
                      <br />
                      Next step: {i.next_step}
                      {i.next_step_due_at && (
                        <> (due {new Date(i.next_step_due_at).toLocaleString()})</>
                      )}
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

