"use client";

import { useState } from "react";

import type { AccountPlanView, AccountPlanSummary } from "@/lib/accountPlan";
import { transformAccountPlanSummary } from "@/lib/accountPlan";
import { cn } from "@/lib/utils";

interface Props {
  initialData: AccountPlanView;
}

function arrayToString(arr: string[]): string {
  return arr.join("\n");
}

function stringToArray(str: string): string[] {
  return str
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function AccountPlanClient({ initialData }: Props) {
  const { systemSlug, systemName, profile, plan } = initialData;

  const existingSummary = plan ? transformAccountPlanSummary(plan.summary) : null;

  const [accountOverview, setAccountOverview] = useState(
    existingSummary?.account_overview ?? "",
  );
  const [businessObjectives, setBusinessObjectives] = useState(
    arrayToString(existingSummary?.business_objectives ?? []),
  );
  const [currentState, setCurrentState] = useState(
    arrayToString(existingSummary?.current_state ?? []),
  );
  const [keyStakeholders, setKeyStakeholders] = useState(
    arrayToString(existingSummary?.key_stakeholders ?? []),
  );
  const [opportunityThemes, setOpportunityThemes] = useState(
    arrayToString(existingSummary?.opportunity_themes ?? []),
  );
  const [risksAndBlocks, setRisksAndBlocks] = useState(
    arrayToString(existingSummary?.risks_and_blocks ?? []),
  );
  const [strategyAndPlays, setStrategyAndPlays] = useState(
    arrayToString(existingSummary?.strategy_and_plays ?? []),
  );
  const [nearTermActions, setNearTermActions] = useState(
    arrayToString(existingSummary?.near_term_actions ?? []),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const summary: AccountPlanSummary = {
        account_overview: accountOverview || "",
        business_objectives: stringToArray(businessObjectives),
        current_state: stringToArray(currentState),
        key_stakeholders: stringToArray(keyStakeholders),
        opportunity_themes: stringToArray(opportunityThemes),
        risks_and_blocks: stringToArray(risksAndBlocks),
        strategy_and_plays: stringToArray(strategyAndPlays),
        near_term_actions: stringToArray(nearTermActions),
      };

      const res = await fetch("/api/account-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemSlug,
          summary,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        setError(json?.error?.message ?? "Failed to save account plan.");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Error saving account plan.");
    } finally {
      setSaving(false);
    }
  }

  // Extract profile summary for display
  let profileSummary: { executive_summary?: string; strategic_priorities?: string[] } | null =
    null;
  if (profile?.summary && typeof profile.summary === "object") {
    try {
      profileSummary = profile.summary as {
        executive_summary?: string;
        strategic_priorities?: string[];
      };
    } catch {
      // Ignore parsing errors
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
        <h2 className="mb-4">Account Context</h2>
        <p className="mb-4">
          <strong>System:</strong> {systemName}
        </p>
        {profileSummary && (
          <div className="space-y-4">
            {profileSummary.executive_summary && (
              <div>
                <h3 className="mb-2">Executive Summary</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {profileSummary.executive_summary}
                </p>
              </div>
            )}
            {profileSummary.strategic_priorities &&
              profileSummary.strategic_priorities.length > 0 && (
                <div>
                  <h3 className="mb-2">Strategic Priorities</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {profileSummary.strategic_priorities.map((priority, i) => (
                      <li key={i} className="text-muted-foreground">{priority}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}
      </section>

      <section className="border border-border/40 rounded-xl p-6 bg-muted/20">
        <h2 className="mb-6">Account Plan</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Summary
            </label>
            <textarea
              value={accountOverview}
              onChange={(e) => setAccountOverview(e.target.value)}
              disabled={saving}
              className="w-full max-w-2xl p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[120px] text-base disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="1-2 paragraphs describing the account overview"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Business Objectives
            </label>
            <textarea
              value={businessObjectives}
              onChange={(e) => setBusinessObjectives(e.target.value)}
              disabled={saving}
              className="w-full max-w-2xl p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[100px] text-base disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="One objective per line"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter one objective per line
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Current State
            </label>
            <textarea
              value={currentState}
              onChange={(e) => setCurrentState(e.target.value)}
              disabled={saving}
              className="w-full max-w-2xl p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[100px] text-base disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="What's true today - one item per line"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter one item per line
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Key Stakeholders
            </label>
            <textarea
              value={keyStakeholders}
              onChange={(e) => setKeyStakeholders(e.target.value)}
              disabled={saving}
              className="w-full max-w-2xl p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[100px] text-base disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Name + role + angle - one per line"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter one stakeholder per line
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Opportunity Themes
            </label>
            <textarea
              value={opportunityThemes}
              onChange={(e) => setOpportunityThemes(e.target.value)}
              disabled={saving}
              className="w-full max-w-2xl p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[100px] text-base disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Major threads we could sell into - one per line"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter one theme per line
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Risks & Blocks
            </label>
            <textarea
              value={risksAndBlocks}
              onChange={(e) => setRisksAndBlocks(e.target.value)}
              disabled={saving}
              className="w-full max-w-2xl p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[100px] text-base disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Risks and blockers - one per line"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter one risk or block per line
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Strategy & Plays
            </label>
            <textarea
              value={strategyAndPlays}
              onChange={(e) => setStrategyAndPlays(e.target.value)}
              disabled={saving}
              className="w-full max-w-2xl p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[100px] text-base disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="What we should do over next 3-6 months - one per line"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter one strategy or play per line
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Near-Term Actions
            </label>
            <textarea
              value={nearTermActions}
              onChange={(e) => setNearTermActions(e.target.value)}
              disabled={saving}
              className="w-full max-w-2xl p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[100px] text-base disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Specific actions next 2-4 weeks - one per line"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter one action per line
            </p>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90",
              "active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed",
              "font-medium"
            )}
          >
            {saving ? "Saving..." : "Save Account Plan"}
          </button>

          {error && (
            <p className="mt-4 text-red-500">
              <strong>Error:</strong> {error}
            </p>
          )}
          {saved && !error && (
            <p className="mt-4 text-green-500">
              <strong>Saved successfully.</strong>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
