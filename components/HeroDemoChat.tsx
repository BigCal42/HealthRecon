"use client";

import { useState } from "react";
import type { ChatResponsePayload } from "@/lib/chatTypes";

export function HeroDemoChat({ systemSlug }: { systemSlug: string }) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<ChatResponsePayload | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    if (!question.trim()) return;
    setPending(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemSlug,
          question,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.ok === false) {
        setError(json.error?.message ?? "Chat request failed.");
        return;
      }

      const data = json.data as ChatResponsePayload;
      setResponse(data);
    } catch (e) {
      setError("Error calling chat API.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <textarea
        rows={3}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask something about this health system..."
        style={{ width: "100%", maxWidth: "600px", padding: "0.5rem" }}
      />
      <div style={{ marginTop: "0.5rem" }}>
        <button onClick={ask} disabled={pending || !question.trim()}>
          {pending ? "Asking..." : "Ask"}
        </button>
      </div>
      {error && <p style={{ marginTop: "0.5rem", color: "#d32f2f" }}>{error}</p>}
      {response && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Answer</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{response.answer}</p>
          {response.sources && response.sources.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <strong>Sources:</strong>
              <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
                {response.sources.map((s, i) => (
                  <li key={i} style={{ marginBottom: "0.25rem" }}>
                    {s.sourceUrl ? (
                      <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                        {s.title || s.sourceUrl}
                      </a>
                    ) : (
                      s.title ?? s.documentId
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

