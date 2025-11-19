"use client";

import { useState } from "react";
import type { OutboundPersona, OutboundPlaybook } from "@/lib/getOutboundPlaybook";

interface Props {
  systemSlug: string;
  systemName: string;
}

const PERSONA_OPTIONS: { value: OutboundPersona; label: string }[] = [
  { value: "cio", label: "CIO" },
  { value: "cfo", label: "CFO" },
  { value: "cmo", label: "CMO" },
  { value: "cnio", label: "CNIO" },
  { value: "cmio", label: "CMIO" },
  { value: "operations_leader", label: "Operations Leader" },
  { value: "it_director", label: "IT Director" },
];

export function OutboundPlaybookClient({ systemSlug, systemName }: Props) {
  const [persona, setPersona] = useState<OutboundPersona>("cio");
  const [playbook, setPlaybook] = useState<OutboundPlaybook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setPlaybook(null);

    try {
      const res = await fetch("/api/outbound-playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemSlug, persona }),
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        setError(json?.error?.message ?? "Failed to generate playbook.");
        return;
      }

      setPlaybook(json.data as OutboundPlaybook);
    } catch (err) {
      setError("Error calling outbound playbook API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <section style={{ marginTop: "2rem" }}>
        <h2>Persona</h2>
        <p>Select who you&apos;re talking to for {systemName}.</p>
        <div style={{ marginBottom: "1rem" }}>
          <select
            value={persona}
            onChange={(e) => setPersona(e.target.value as OutboundPersona)}
            disabled={loading}
            style={{ padding: "0.5rem", fontSize: "1rem", minWidth: "200px" }}
          >
            {PERSONA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <button
            onClick={generate}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating..." : "Generate Playbook"}
          </button>
        </div>
      </section>

      {error && (
        <section style={{ marginTop: "2rem", color: "red" }}>
          <p>{error}</p>
        </section>
      )}

      {playbook && (
        <section style={{ marginTop: "2rem" }}>
          <h2>Summary</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{playbook.summary}</p>

          {playbook.keyThemes.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Key Themes</h3>
              <ul>
                {playbook.keyThemes.map((theme, i) => (
                  <li key={i}>{theme}</li>
                ))}
              </ul>
            </>
          )}

          {playbook.recommendedTargets.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Recommended Targets</h3>
              <ul>
                {playbook.recommendedTargets.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </>
          )}

          {playbook.talkingPoints.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Talking Points</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {playbook.talkingPoints.map((tp, i) => (
                  <li key={i} style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "4px" }}>
                    <p>
                      <strong>{tp.title}</strong>
                    </p>
                    <p>{tp.rationale}</p>
                    {tp.evidence && tp.evidence.length > 0 && (
                      <ul style={{ marginTop: "0.5rem" }}>
                        {tp.evidence.map((ev, j) => (
                          <li key={j} style={{ fontSize: "0.9em", color: "#666" }}>
                            {ev}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {playbook.snippets.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Outbound Snippets</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {playbook.snippets.map((s, i) => (
                  <li key={i} style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "4px" }}>
                    <p>
                      <strong>
                        [{s.channel.toUpperCase()}] {s.persona.toUpperCase()}
                      </strong>
                    </p>
                    {s.subject && (
                      <p>
                        <strong>Subject:</strong> {s.subject}
                      </p>
                    )}
                    <p>
                      <strong>Opener:</strong> {s.opener}
                    </p>
                    <p>
                      <strong>Core message:</strong> {s.coreMessage}
                    </p>
                    <p>
                      <strong>Call to action:</strong> {s.callToAction}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}

