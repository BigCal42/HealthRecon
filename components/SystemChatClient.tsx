"use client";

import { useState } from "react";
import type { ChatResponsePayload, ChatSource } from "@/lib/chatTypes";

interface SystemChatClientProps {
  systemSlug: string;
  systemName: string;
}

interface ChatTurn {
  id: string;
  question: string;
  answer: string;
  sources: ChatSource[];
  feedback?: "up" | "down";
}

export function SystemChatClient({ systemSlug, systemName }: SystemChatClientProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);

  async function ask() {
    const q = question.trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemSlug, question: q }),
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        setError(json?.error?.message ?? "Chat failed.");
        return;
      }

      const data = json.data as ChatResponsePayload;

      setTurns((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          question: q,
          answer: data.answer,
          sources: data.sources ?? [],
        },
      ]);
      setQuestion("");
    } catch {
      setError("Error calling chat API.");
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(turnId: string, rating: "up" | "down") {
    const turn = turns.find((t) => t.id === turnId);
    if (!turn || turn.feedback) return;

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemSlug,
          route: "/api/chat",
          question: turn.question,
          answer: turn.answer,
          rating,
          meta: {
            sources: turn.sources.map((s) => ({
              documentId: s.documentId,
              title: s.title,
              sourceUrl: s.sourceUrl,
            })),
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || json.ok === false) {
        // Fail silently or show a minimal error; do not throw
        return;
      }

      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? {
                ...t,
                feedback: rating,
              }
            : t,
        ),
      );
    } catch {
      // Fail silently or show a minimal error; do not throw
    }
  }

  return (
    <div>
      <section style={{ marginTop: "2rem" }}>
        <h2>Ask a question about {systemName}</h2>
        <div style={{ marginBottom: "0.5rem" }}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
            placeholder="Enter your question..."
            rows={3}
            style={{ width: "100%", maxWidth: "600px", padding: "0.5rem" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                ask();
              }
            }}
          />
        </div>
        <div>
          <button onClick={ask} disabled={loading || !question.trim()}>
            {loading ? "Thinking..." : "Ask"}
          </button>
        </div>
        {error && (
          <p style={{ marginTop: "0.5rem", color: "#d32f2f" }}>
            <strong>Error:</strong> {error}
          </p>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        {turns.length === 0 ? (
          <p>No questions yet. Ask something about {systemName} to get started.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {turns.map((t) => (
              <li key={t.id} style={{ marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "1px solid #e0e0e0" }}>
                <div style={{ marginBottom: "1rem" }}>
                  <p>
                    <strong>You:</strong> {t.question}
                  </p>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <p>
                    <strong>Answer:</strong>
                  </p>
                  <p style={{ whiteSpace: "pre-wrap" }}>{t.answer}</p>
                </div>

                {t.sources && t.sources.length > 0 && (
                  <div style={{ marginBottom: "1rem" }}>
                    <strong>Sources:</strong>
                    <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
                      {t.sources.map((s, i) => (
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

                <div>
                  <button
                    onClick={() => sendFeedback(t.id, "up")}
                    disabled={t.feedback !== undefined}
                    style={{
                      marginRight: "0.5rem",
                      padding: "0.25rem 0.5rem",
                      cursor: t.feedback === undefined ? "pointer" : "not-allowed",
                      opacity: t.feedback === undefined ? 1 : 0.5,
                    }}
                  >
                    👍
                  </button>
                  <button
                    onClick={() => sendFeedback(t.id, "down")}
                    disabled={t.feedback !== undefined}
                    style={{
                      padding: "0.25rem 0.5rem",
                      cursor: t.feedback === undefined ? "pointer" : "not-allowed",
                      opacity: t.feedback === undefined ? 1 : 0.5,
                    }}
                  >
                    👎
                  </button>
                  {t.feedback && (
                    <span style={{ marginLeft: "0.5rem", color: "#666" }}>Feedback: {t.feedback === "up" ? "👍" : "👎"}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

