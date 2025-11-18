"use client";

import { useState } from "react";

interface SystemMeetingPrepProps {
  slug: string;
}

type MeetingPrep = {
  meeting_title: string;
  objectives: string[];
  attendee_overview: string[];
  system_context: string[];
  talk_tracks: string[];
  discovery_questions: string[];
  landmines_and_risks: string[];
  proposed_next_steps: string[];
  personal_notes_suggestions: string[];
};

export function SystemMeetingPrep({ slug }: SystemMeetingPrepProps) {
  const [contactName, setContactName] = useState("");
  const [meetingGoal, setMeetingGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prep, setPrep] = useState<MeetingPrep | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setStatus("Generating meeting prep...");
    setError(null);

    try {
      const res = await fetch("/api/meeting-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          contactName: contactName || null,
          meetingGoal: meetingGoal || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setStatus("Failed to generate meeting prep.");
        setError("Failed to generate meeting prep.");
        return;
      }

      setPrep(data.prep);
      setStatus("Meeting prep ready.");
    } catch (err) {
      setStatus("Failed to generate meeting prep.");
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const copyPrep = async () => {
    if (!prep) return;

    const sections = [
      prep.meeting_title,
      "",
      "OBJECTIVES",
      prep.objectives.map((o) => `• ${o}`).join("\n"),
      "",
      "ATTENDEE OVERVIEW",
      prep.attendee_overview.map((o) => `• ${o}`).join("\n"),
      "",
      "SYSTEM CONTEXT",
      prep.system_context.map((o) => `• ${o}`).join("\n"),
      "",
      "TALK TRACKS",
      prep.talk_tracks.map((o) => `• ${o}`).join("\n"),
      "",
      "DISCOVERY QUESTIONS",
      prep.discovery_questions.map((o) => `• ${o}`).join("\n"),
      "",
      "LANDMINES & RISKS",
      prep.landmines_and_risks.map((o) => `• ${o}`).join("\n"),
      "",
      "PROPOSED NEXT STEPS",
      prep.proposed_next_steps.map((o) => `• ${o}`).join("\n"),
      "",
      "PERSONAL NOTES SUGGESTIONS",
      prep.personal_notes_suggestions.map((o) => `• ${o}`).join("\n"),
    ];

    const text = sections.join("\n");

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setStatus("Meeting prep copied to clipboard.");
    } else {
      setStatus("Clipboard API not available.");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <label htmlFor="contact-name" style={{ display: "block", marginBottom: "0.25rem" }}>
            Contact Name (optional):
          </label>
          <input
            id="contact-name"
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Optional contact name (e.g. Molly McCloy)"
            style={{ width: "100%", maxWidth: "400px", padding: "0.5rem" }}
          />
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <label htmlFor="meeting-goal" style={{ display: "block", marginBottom: "0.25rem" }}>
            Meeting Goal / Context (optional):
          </label>
          <textarea
            id="meeting-goal"
            value={meetingGoal}
            onChange={(e) => setMeetingGoal(e.target.value)}
            placeholder="Optional meeting goal/context"
            style={{ width: "100%", maxWidth: "600px", padding: "0.5rem", minHeight: "80px" }}
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{ padding: "0.5rem 1rem", marginTop: "0.5rem" }}
        >
          {loading ? "Generating..." : "Generate Meeting Prep"}
        </button>
      </div>

      {status && (
        <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "0.5rem" }}>{status}</p>
      )}

      {error && (
        <p style={{ color: "red", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Error: {error}</p>
      )}

      {prep && (
        <div style={{ marginTop: "1.5rem" }}>
          {prep.meeting_title && (
            <div style={{ marginBottom: "1rem" }}>
              <h3 style={{ marginBottom: "0.5rem" }}>{prep.meeting_title}</h3>
            </div>
          )}

          {prep.objectives && prep.objectives.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <h4 style={{ marginBottom: "0.5rem" }}>Objectives</h4>
              <ul>
                {prep.objectives.map((o, i) => (
                  <li key={i} style={{ marginBottom: "0.25rem" }}>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prep.attendee_overview && prep.attendee_overview.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <h4 style={{ marginBottom: "0.5rem" }}>Attendee Overview</h4>
              <ul>
                {prep.attendee_overview.map((o, i) => (
                  <li key={i} style={{ marginBottom: "0.25rem" }}>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prep.system_context && prep.system_context.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <h4 style={{ marginBottom: "0.5rem" }}>System Context</h4>
              <ul>
                {prep.system_context.map((o, i) => (
                  <li key={i} style={{ marginBottom: "0.25rem" }}>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prep.talk_tracks && prep.talk_tracks.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <h4 style={{ marginBottom: "0.5rem" }}>Talk Tracks</h4>
              <ul>
                {prep.talk_tracks.map((o, i) => (
                  <li key={i} style={{ marginBottom: "0.25rem" }}>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prep.discovery_questions && prep.discovery_questions.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <h4 style={{ marginBottom: "0.5rem" }}>Discovery Questions</h4>
              <ul>
                {prep.discovery_questions.map((o, i) => (
                  <li key={i} style={{ marginBottom: "0.25rem" }}>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prep.landmines_and_risks && prep.landmines_and_risks.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <h4 style={{ marginBottom: "0.5rem" }}>Landmines & Risks</h4>
              <ul>
                {prep.landmines_and_risks.map((o, i) => (
                  <li key={i} style={{ marginBottom: "0.25rem" }}>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prep.proposed_next_steps && prep.proposed_next_steps.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <h4 style={{ marginBottom: "0.5rem" }}>Proposed Next Steps</h4>
              <ul>
                {prep.proposed_next_steps.map((o, i) => (
                  <li key={i} style={{ marginBottom: "0.25rem" }}>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prep.personal_notes_suggestions && prep.personal_notes_suggestions.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <h4 style={{ marginBottom: "0.5rem" }}>Personal Notes Suggestions</h4>
              <ul>
                {prep.personal_notes_suggestions.map((o, i) => (
                  <li key={i} style={{ marginBottom: "0.25rem" }}>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: "1rem" }}>
            <button
              onClick={copyPrep}
              style={{ padding: "0.5rem 1rem", marginTop: "0.5rem" }}
            >
              Copy Prep to Clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

