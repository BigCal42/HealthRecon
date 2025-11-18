"use client";

import { useState } from "react";

interface SystemOutboundComposerProps {
  slug: string;
}

type EmailDraft = {
  subject: string;
  body: string;
};

type CallDraft = {
  opening: string;
  discovery_questions: string[];
  value_narrative: string;
  closing: string;
};

export function SystemOutboundComposer({
  slug,
}: SystemOutboundComposerProps) {
  const [kind, setKind] = useState<"email" | "call">("email");
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [callDraft, setCallDraft] = useState<CallDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setStatus("Generating draft...");
    setError(null);

    try {
      const res = await fetch("/api/outbound-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, kind, note: note.trim() || undefined }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError("Failed to generate draft.");
        setStatus(null);
        return;
      }

      if (kind === "email" && data.draft) {
        setEmailDraft(data.draft as EmailDraft);
        setCallDraft(null);
      } else if (kind === "call" && data.draft) {
        setCallDraft(data.draft as CallDraft);
        setEmailDraft(null);
      }

      setStatus("Draft ready.");
    } catch (err) {
      setError("Failed to generate draft.");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const copyEmailToClipboard = async () => {
    if (!emailDraft) return;

    const text = `Subject: ${emailDraft.subject}\n\n${emailDraft.body}`;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setStatus("Email copied to clipboard.");
      } catch (err) {
        setError("Failed to copy to clipboard.");
      }
    } else {
      setError("Clipboard API not available.");
    }
  };

  const copyCallToClipboard = async () => {
    if (!callDraft) return;

    const parts = [
      `Opening:\n${callDraft.opening}`,
      `\nDiscovery Questions:`,
      ...callDraft.discovery_questions.map((q, i) => `${i + 1}. ${q}`),
      `\nValue Narrative:\n${callDraft.value_narrative}`,
      `\nClosing:\n${callDraft.closing}`,
    ];

    const text = parts.join("\n");

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setStatus("Call script copied to clipboard.");
      } catch (err) {
        setError("Failed to copy to clipboard.");
      }
    } else {
      setError("Clipboard API not available.");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Draft Type:
        </label>
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as "email" | "call");
            setEmailDraft(null);
            setCallDraft(null);
            setStatus(null);
            setError(null);
          }}
          disabled={loading}
          style={{ marginBottom: "1rem", padding: "0.5rem" }}
        >
          <option value="email">Email</option>
          <option value="call">Call</option>
        </select>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Optional Note:
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note (e.g. focus on Epic + AI for nursing leaders)"
          disabled={loading}
          style={{
            width: "100%",
            minHeight: "80px",
            padding: "0.5rem",
            fontFamily: "inherit",
          }}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate Draft"}
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {status && <p style={{ fontSize: "0.875rem", color: "#666" }}>{status}</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {kind === "email" && emailDraft && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Email Draft</h3>
          <div style={{ marginBottom: "1rem" }}>
            <p>
              <strong>Subject:</strong> {emailDraft.subject}
            </p>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                padding: "1rem",
                backgroundColor: "#f5f5f5",
                borderRadius: "4px",
              }}
            >
              {emailDraft.body}
            </pre>
          </div>
          <button onClick={copyEmailToClipboard}>Copy email to clipboard</button>
        </div>
      )}

      {kind === "call" && callDraft && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Call Script</h3>
          <div style={{ marginBottom: "1rem" }}>
            <p>
              <strong>Opening:</strong> {callDraft.opening}
            </p>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <h4>Discovery Questions</h4>
            <ul>
              {callDraft.discovery_questions?.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <h4>Value Narrative</h4>
            <p>{callDraft.value_narrative}</p>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <h4>Closing</h4>
            <p>{callDraft.closing}</p>
          </div>
          <button onClick={copyCallToClipboard}>Copy call script</button>
        </div>
      )}
    </div>
  );
}

