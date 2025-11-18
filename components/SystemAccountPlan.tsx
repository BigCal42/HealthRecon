"use client";

import { useState, useEffect, useCallback } from "react";

interface SystemAccountPlanProps {
  slug: string;
}

type AccountPlan = {
  id: string;
  system_id: string;
  summary: {
    account_overview: string;
    business_objectives: string[];
    current_state: string[];
    key_stakeholders: string[];
    opportunity_themes: string[];
    risks_and_blocks: string[];
    strategy_and_plays: string[];
    near_term_actions: string[];
  };
  created_at: string;
};

export function SystemAccountPlan({ slug }: SystemAccountPlanProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [plan, setPlan] = useState<AccountPlan | null>(null);
  const [rawPlan, setRawPlan] = useState<string>("");

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/account-plan?slug=${encodeURIComponent(slug)}`,
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load account plan");
        return;
      }

      if (data.plan) {
        setPlan(data.plan);
        setRawPlan(JSON.stringify(data.plan.summary, null, 2));
      } else {
        setPlan(null);
        setRawPlan("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const handleGenerate = async () => {
    setStatus("Generating account plan...");
    setError(null);
    try {
      const res = await fetch("/api/account-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, mode: "generate" }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setStatus("Failed to generate account plan.");
        setError(data.error ?? "Failed to generate account plan");
        return;
      }

      setStatus("Account plan generated.");
      if (data.plan) {
        setPlan(data.plan);
        setRawPlan(JSON.stringify(data.plan.summary, null, 2));
      }
    } catch (err) {
      setStatus("Failed to generate account plan.");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleSave = async () => {
    setError(null);
    let parsed: any;
    try {
      parsed = JSON.parse(rawPlan);
    } catch (err) {
      setError("Invalid JSON; cannot save.");
      return;
    }

    setStatus("Saving account plan...");
    try {
      const res = await fetch("/api/account-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, mode: "save", plan: parsed }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setStatus("Failed to save account plan.");
        setError(data.error ?? "Failed to save account plan");
        return;
      }

      setStatus("Account plan saved.");
      if (data.plan) {
        setPlan(data.plan);
        setRawPlan(JSON.stringify(data.plan.summary, null, 2));
      }
    } catch (err) {
      setStatus("Failed to save account plan.");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  if (loading && !plan) {
    return <p>Loading account plan...</p>;
  }

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={handleGenerate} disabled={loading}>
          Generate Account Plan (LLM)
        </button>
        <button
          onClick={handleSave}
          disabled={loading || !rawPlan}
          style={{ marginLeft: "0.5rem" }}
        >
          Save Edited Plan
        </button>
      </div>

      {status && (
        <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1rem" }}>
          {status}
        </p>
      )}

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {!plan ? (
        <p>No account plan yet. Generate one to get started.</p>
      ) : (
        <>
          <div style={{ marginTop: "1.5rem" }}>
            <h3>Account Overview</h3>
            <p>{plan.summary.account_overview}</p>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h3>Business Objectives</h3>
            {plan.summary.business_objectives &&
            plan.summary.business_objectives.length > 0 ? (
              <ul>
                {plan.summary.business_objectives.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            ) : (
              <p>No business objectives available.</p>
            )}
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h3>Current State</h3>
            {plan.summary.current_state &&
            plan.summary.current_state.length > 0 ? (
              <ul>
                {plan.summary.current_state.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            ) : (
              <p>No current state information available.</p>
            )}
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h3>Key Stakeholders</h3>
            {plan.summary.key_stakeholders &&
            plan.summary.key_stakeholders.length > 0 ? (
              <ul>
                {plan.summary.key_stakeholders.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            ) : (
              <p>No key stakeholders available.</p>
            )}
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h3>Opportunity Themes</h3>
            {plan.summary.opportunity_themes &&
            plan.summary.opportunity_themes.length > 0 ? (
              <ul>
                {plan.summary.opportunity_themes.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            ) : (
              <p>No opportunity themes available.</p>
            )}
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h3>Risks & Blocks</h3>
            {plan.summary.risks_and_blocks &&
            plan.summary.risks_and_blocks.length > 0 ? (
              <ul>
                {plan.summary.risks_and_blocks.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            ) : (
              <p>No risks and blocks identified.</p>
            )}
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h3>Strategy & Plays</h3>
            {plan.summary.strategy_and_plays &&
            plan.summary.strategy_and_plays.length > 0 ? (
              <ul>
                {plan.summary.strategy_and_plays.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            ) : (
              <p>No strategy and plays available.</p>
            )}
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h3>Near-Term Actions</h3>
            {plan.summary.near_term_actions &&
            plan.summary.near_term_actions.length > 0 ? (
              <ul>
                {plan.summary.near_term_actions.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            ) : (
              <p>No near-term actions available.</p>
            )}
          </div>

          <div style={{ marginTop: "2rem" }}>
            <h3>Raw Plan JSON (Advanced)</h3>
            <textarea
              value={rawPlan}
              onChange={(e) => setRawPlan(e.target.value)}
              rows={20}
              cols={80}
              style={{ width: "100%", fontFamily: "monospace" }}
            />
          </div>
        </>
      )}
    </div>
  );
}

