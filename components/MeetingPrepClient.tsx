"use client";

import { useState } from "react";
import type { MeetingPrepBrief, MeetingPrepInput } from "@/lib/getMeetingPrep";

interface Props {
  systemSlug: string;
  systemName: string;
}

const MEETING_TYPES: { value: MeetingPrepInput["meetingType"]; label: string }[] = [
  { value: "intro", label: "Intro" },
  { value: "discovery", label: "Discovery" },
  { value: "strategy_review", label: "Strategy Review" },
  { value: "renewal", label: "Renewal" },
  { value: "exec_briefing", label: "Executive Briefing" },
];

export function MeetingPrepClient({ systemSlug, systemName }: Props) {
  const [meetingType, setMeetingType] = useState<MeetingPrepInput["meetingType"]>("discovery");
  const [audienceDescription, setAudienceDescription] = useState("");
  const [myObjective, setMyObjective] = useState("");
  const [timeBoxMinutes, setTimeBoxMinutes] = useState<number | undefined>(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prep, setPrep] = useState<MeetingPrepBrief | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setPrep(null);

    try {
      const body = {
        systemSlug,
        meetingType,
        audienceDescription: audienceDescription || undefined,
        myObjective: myObjective || undefined,
        timeBoxMinutes: typeof timeBoxMinutes === "number" ? timeBoxMinutes : undefined,
      };

      const res = await fetch("/api/meeting-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        setError(json?.error?.message ?? "Failed to generate meeting prep.");
        return;
      }

      setPrep(json.data as MeetingPrepBrief);
    } catch {
      setError("Error calling meeting prep API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <section style={{ marginTop: "2rem" }}>
        <h2>Meeting Details</h2>
        <p>Describe the upcoming meeting with {systemName}.</p>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Meeting type
            <select
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value as MeetingPrepInput["meetingType"])}
              disabled={loading}
              style={{ display: "block", marginTop: "0.25rem", padding: "0.5rem", fontSize: "1rem", minWidth: "200px" }}
            >
              {MEETING_TYPES.map((mt) => (
                <option key={mt.value} value={mt.value}>
                  {mt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Audience (optional)
            <textarea
              value={audienceDescription}
              onChange={(e) => setAudienceDescription(e.target.value)}
              disabled={loading}
              style={{
                display: "block",
                marginTop: "0.25rem",
                width: "100%",
                maxWidth: "600px",
                padding: "0.5rem",
                minHeight: "80px",
              }}
              placeholder="e.g., CIO + VP Apps"
            />
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Your objective (optional)
            <textarea
              value={myObjective}
              onChange={(e) => setMyObjective(e.target.value)}
              disabled={loading}
              style={{
                display: "block",
                marginTop: "0.25rem",
                width: "100%",
                maxWidth: "600px",
                padding: "0.5rem",
                minHeight: "80px",
              }}
              placeholder="Your goal for this meeting"
            />
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Timebox (minutes, optional)
            <input
              type="number"
              min={15}
              max={180}
              value={timeBoxMinutes ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setTimeBoxMinutes(value ? Number(value) : undefined);
              }}
              disabled={loading}
              style={{ display: "block", marginTop: "0.25rem", padding: "0.5rem", fontSize: "1rem", minWidth: "200px" }}
            />
          </label>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Generating..." : "Generate Meeting Prep"}
        </button>
      </section>

      {error && (
        <section style={{ marginTop: "2rem", color: "red" }}>
          <p>{error}</p>
        </section>
      )}

      {prep && (
        <section style={{ marginTop: "2rem" }}>
          <h2>Executive Summary</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{prep.executiveSummary}</p>

          {prep.objectives.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Objectives</h3>
              <ul>
                {prep.objectives.map((obj, i) => (
                  <li key={i} style={{ marginBottom: "0.5rem" }}>
                    {obj}
                  </li>
                ))}
              </ul>
            </>
          )}

          {prep.sections.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Meeting Sections</h3>
              {prep.sections.map((sec, i) => (
                <div key={i} style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "4px" }}>
                  <h4>{sec.title}</h4>
                  <p style={{ whiteSpace: "pre-wrap" }}>{sec.body}</p>
                  {sec.bullets && sec.bullets.length > 0 && (
                    <ul style={{ marginTop: "0.5rem" }}>
                      {sec.bullets.map((b, j) => (
                        <li key={j} style={{ marginBottom: "0.25rem" }}>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </>
          )}

          {prep.suggestedQuestions.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Suggested Questions</h3>
              <ul>
                {prep.suggestedQuestions.map((q, i) => (
                  <li key={i} style={{ marginBottom: "0.5rem" }}>
                    {q}
                  </li>
                ))}
              </ul>
            </>
          )}

          {prep.potentialRisksOrLandmines.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Risks / Landmines</h3>
              <ul>
                {prep.potentialRisksOrLandmines.map((r, i) => (
                  <li key={i} style={{ marginBottom: "0.5rem" }}>
                    {r}
                  </li>
                ))}
              </ul>
            </>
          )}

          {prep.suggestedNextSteps.length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Suggested Next Steps</h3>
              <ul>
                {prep.suggestedNextSteps.map((s, i) => (
                  <li key={i} style={{ marginBottom: "0.5rem" }}>
                    {s}
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

