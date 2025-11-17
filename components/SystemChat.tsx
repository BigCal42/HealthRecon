"use client";

import { useState } from "react";

interface SystemChatProps {
  slug: string;
}

export function SystemChat({ slug }: SystemChatProps) {
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerId, setAnswerId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);

  const handleAsk = async () => {
    if (!question.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, question }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to get answer");
        return;
      }

      setAnswer(data.answer ?? "No answer provided");
      setAnswerId(
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now()),
      );
      setFeedbackStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  async function sendFeedback(sentiment: "up" | "down") {
    if (!answerId) return;

    setFeedbackStatus("Sending feedback...");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          kind: "chat",
          targetId: answerId,
          sentiment,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setFeedbackStatus("Feedback recorded. Thank you.");
      } else {
        setFeedbackStatus("Failed to record feedback.");
      }
    } catch {
      setFeedbackStatus("Failed to record feedback.");
    }
  }

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>Ask a question</h2>
      <div style={{ marginBottom: "0.5rem" }}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter your question about this system..."
          rows={3}
          style={{ width: "100%", maxWidth: "600px", padding: "0.5rem" }}
        />
      </div>
      <div style={{ marginBottom: "0.5rem" }}>
        <button onClick={handleAsk} disabled={loading || !question.trim()}>
          {loading ? "Asking..." : "Ask"}
        </button>
      </div>
      {answer && (
        <div style={{ marginTop: "1rem" }}>
          <p>
            <strong>Answer:</strong>
          </p>
          <p>{answer}</p>
          <div style={{ marginTop: "0.5rem" }}>
            <button onClick={() => sendFeedback("up")} style={{ marginRight: "0.5rem" }}>
              👍
            </button>
            <button onClick={() => sendFeedback("down")}>👎</button>
          </div>
          {feedbackStatus && (
            <p style={{ marginTop: "0.5rem", fontSize: "0.9em", color: "#666" }}>
              {feedbackStatus}
            </p>
          )}
        </div>
      )}
      {error && (
        <div style={{ marginTop: "1rem", color: "#d32f2f" }}>
          <p>Error: {error}</p>
        </div>
      )}
    </div>
  );
}

