"use client";

import { useState } from "react";
import type { OpportunityWorkspaceView, DbOpportunity, DbOpportunitySuggestion, DbSignal, DbInteraction } from "@/lib/opportunities";

interface Props {
  initialData: OpportunityWorkspaceView;
}

type Priority = "low" | "medium" | "high";

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return "N/A";
  }
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return "N/A";
  }
}

function getSeverityColor(severity: string | null): string {
  if (!severity) return "#666";
  const s = severity.toLowerCase();
  if (s === "high" || s === "critical") return "#dc2626";
  if (s === "medium") return "#f59e0b";
  return "#10b981";
}

function getPriorityColor(priority: Priority | null): string {
  if (!priority) return "#666";
  if (priority === "high") return "#dc2626";
  if (priority === "medium") return "#f59e0b";
  return "#10b981";
}

function getPriorityFromNumber(priority: number | null): Priority | null {
  if (priority === null) return null;
  if (priority >= 7) return "high";
  if (priority >= 4) return "medium";
  return "low";
}

function getPriorityNumber(priority: Priority | null): number | null {
  if (!priority) return null;
  const map: Record<Priority, number> = { low: 1, medium: 5, high: 10 };
  return map[priority];
}

export function OpportunitiesClient({ initialData }: Props) {
  const [data, setData] = useState<OpportunityWorkspaceView>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for editing/adding
  const [formTitle, setFormTitle] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStage, setFormStage] = useState("");
  const [formPriority, setFormPriority] = useState<Priority | null>(null);

  async function refreshData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities?systemSlug=${encodeURIComponent(data.systemSlug)}`);
      const json = await res.json();
      if (!res.ok || json.ok === false) {
        setError(json?.error?.message ?? "Failed to refresh data");
        return;
      }
      // Re-fetch full workspace view would require a new endpoint or reconstructing
      // For now, just update opportunities from the API response
      if (json.data?.opportunities) {
        setData((prev) => ({
          ...prev,
          openOpportunities: json.data.opportunities.filter(
            (opp: DbOpportunity) => !["closed", "won", "lost"].includes(opp.status.toLowerCase()),
          ),
          topOpportunities: json.data.opportunities.filter(
            (opp: DbOpportunity) =>
              (opp.priority !== null && opp.priority >= 7) ||
              (opp.stage && ["discovery", "qualification", "proposal"].includes(opp.stage.toLowerCase())),
          ),
        }));
      }
    } catch (err) {
      setError("Error refreshing data");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(opp: DbOpportunity) {
    setEditingId(opp.id);
    setFormTitle(opp.title);
    setFormNotes(opp.description ?? "");
    setFormStage(opp.stage ?? "");
    setFormPriority(getPriorityFromNumber(opp.priority));
  }

  function cancelEdit() {
    setEditingId(null);
    setFormTitle("");
    setFormNotes("");
    setFormStage("");
    setFormPriority(null);
  }

  function startAdd() {
    setShowAddForm(true);
    setFormTitle("");
    setFormNotes("");
    setFormStage("");
    setFormPriority(null);
  }

  function cancelAdd() {
    setShowAddForm(false);
    setFormTitle("");
    setFormNotes("");
    setFormStage("");
    setFormPriority(null);
  }

  async function handleSave() {
    if (!formTitle.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: {
        systemSlug: string;
        id?: string;
        title: string;
        notes?: string;
        stage?: string;
        priority?: Priority;
      } = {
        systemSlug: data.systemSlug,
        title: formTitle,
        notes: formNotes || undefined,
        stage: formStage || undefined,
        priority: formPriority || undefined,
      };

      if (editingId) {
        payload.id = editingId;
      }

      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        setError(json?.error?.message ?? "Failed to save opportunity");
        return;
      }

      await refreshData();
      if (editingId) {
        cancelEdit();
      } else {
        cancelAdd();
      }
    } catch (err) {
      setError("Error saving opportunity");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this opportunity?")) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/opportunities?systemSlug=${encodeURIComponent(data.systemSlug)}&id=${id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        setError(json?.error?.message ?? "Failed to delete opportunity");
        return;
      }

      await refreshData();
    } catch (err) {
      setError("Error deleting opportunity");
    } finally {
      setSaving(false);
    }
  }

  async function convertSuggestion(suggestion: DbOpportunitySuggestion) {
    setFormTitle(suggestion.title);
    setFormNotes(suggestion.description ?? "");
    setFormStage("");
    setFormPriority(null);
    setShowAddForm(true);
  }

  return (
    <div>
      {error && (
        <div style={{ padding: "1rem", backgroundColor: "#fee", color: "#c00", marginBottom: "1rem", borderRadius: "4px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Top Opportunities */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Top Opportunities</h2>
        {data.topOpportunities.length === 0 ? (
          <p>No top opportunities found.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {data.topOpportunities.map((opp) => (
              <li key={opp.id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0 }}>{opp.title}</h3>
                    {opp.description && <p style={{ margin: "0.5rem 0", color: "#666" }}>{opp.description}</p>}
                    <div style={{ display: "flex", gap: "1rem", fontSize: "0.875rem", color: "#666" }}>
                      {opp.stage && <span>Stage: {opp.stage}</span>}
                      {opp.priority !== null && (
                        <span style={{ color: getPriorityColor(getPriorityFromNumber(opp.priority)) }}>
                          Priority: {getPriorityFromNumber(opp.priority) ?? "N/A"}
                        </span>
                      )}
                      <span>Status: {opp.status}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(opp)}
                    disabled={saving}
                    style={{
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.875rem",
                      backgroundColor: "#0070f3",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Signals Worth Acting On */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Signals Worth Acting On</h2>
        {data.signals.length === 0 ? (
          <p>No signals found.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {data.signals.map((signal) => (
              <li key={signal.id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                          backgroundColor: getSeverityColor(signal.severity),
                          color: "white",
                          fontSize: "0.875rem",
                          fontWeight: "bold",
                        }}
                      >
                        {signal.severity}
                      </span>
                      <span style={{ fontSize: "0.875rem", color: "#666" }}>{signal.category}</span>
                    </div>
                    <p style={{ margin: "0.5rem 0" }}>{signal.summary}</p>
                    {signal.document_id && (
                      <p style={{ fontSize: "0.875rem", color: "#666", margin: "0.5rem 0" }}>
                        <a href={`/documents/${signal.document_id}`} target="_blank" rel="noopener noreferrer">
                          View source document
                        </a>
                      </p>
                    )}
                    <p style={{ fontSize: "0.875rem", color: "#666" }}>Created: {formatDate(signal.created_at)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Open Opportunities */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Open Opportunities</h2>
        <button
          onClick={startAdd}
          disabled={saving || showAddForm}
          style={{
            padding: "0.5rem 1rem",
            marginBottom: "1rem",
            fontSize: "1rem",
            backgroundColor: showAddForm ? "#ccc" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: showAddForm ? "not-allowed" : "pointer",
          }}
        >
          Add Opportunity
        </button>

        {showAddForm && (
          <div style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "4px", backgroundColor: "#f9f9f9" }}>
            <h3>Add New Opportunity</h3>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                Title *
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  disabled={saving}
                  style={{
                    display: "block",
                    marginTop: "0.25rem",
                    width: "100%",
                    maxWidth: "500px",
                    padding: "0.5rem",
                    fontSize: "1rem",
                  }}
                />
              </label>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                Notes
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  disabled={saving}
                  style={{
                    display: "block",
                    marginTop: "0.25rem",
                    width: "100%",
                    maxWidth: "500px",
                    padding: "0.5rem",
                    fontSize: "1rem",
                    minHeight: "100px",
                  }}
                />
              </label>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                Stage
                <input
                  type="text"
                  value={formStage}
                  onChange={(e) => setFormStage(e.target.value)}
                  disabled={saving}
                  placeholder="e.g., discovery, qualification, proposal"
                  style={{
                    display: "block",
                    marginTop: "0.25rem",
                    width: "100%",
                    maxWidth: "500px",
                    padding: "0.5rem",
                    fontSize: "1rem",
                  }}
                />
              </label>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                Priority
                <select
                  value={formPriority ?? ""}
                  onChange={(e) => setFormPriority((e.target.value as Priority) || null)}
                  disabled={saving}
                  style={{
                    display: "block",
                    marginTop: "0.25rem",
                    width: "100%",
                    maxWidth: "500px",
                    padding: "0.5rem",
                    fontSize: "1rem",
                  }}
                >
                  <option value="">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={handleSave}
                disabled={saving || !formTitle.trim()}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "1rem",
                  backgroundColor: saving || !formTitle.trim() ? "#ccc" : "#0070f3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: saving || !formTitle.trim() ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={cancelAdd}
                disabled={saving}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "1rem",
                  backgroundColor: "#666",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {data.openOpportunities.length === 0 ? (
          <p>No open opportunities found.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {data.openOpportunities.map((opp) => (
              <li key={opp.id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "4px" }}>
                {editingId === opp.id ? (
                  <div style={{ backgroundColor: "#f9f9f9", padding: "1rem", borderRadius: "4px" }}>
                    <h3>Edit Opportunity</h3>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem" }}>
                        Title *
                        <input
                          type="text"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          disabled={saving}
                          style={{
                            display: "block",
                            marginTop: "0.25rem",
                            width: "100%",
                            maxWidth: "500px",
                            padding: "0.5rem",
                            fontSize: "1rem",
                          }}
                        />
                      </label>
                    </div>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem" }}>
                        Notes
                        <textarea
                          value={formNotes}
                          onChange={(e) => setFormNotes(e.target.value)}
                          disabled={saving}
                          style={{
                            display: "block",
                            marginTop: "0.25rem",
                            width: "100%",
                            maxWidth: "500px",
                            padding: "0.5rem",
                            fontSize: "1rem",
                            minHeight: "100px",
                          }}
                        />
                      </label>
                    </div>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem" }}>
                        Stage
                        <input
                          type="text"
                          value={formStage}
                          onChange={(e) => setFormStage(e.target.value)}
                          disabled={saving}
                          style={{
                            display: "block",
                            marginTop: "0.25rem",
                            width: "100%",
                            maxWidth: "500px",
                            padding: "0.5rem",
                            fontSize: "1rem",
                          }}
                        />
                      </label>
                    </div>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", marginBottom: "0.5rem" }}>
                        Priority
                        <select
                          value={formPriority ?? ""}
                          onChange={(e) => setFormPriority((e.target.value as Priority) || null)}
                          disabled={saving}
                          style={{
                            display: "block",
                            marginTop: "0.25rem",
                            width: "100%",
                            maxWidth: "500px",
                            padding: "0.5rem",
                            fontSize: "1rem",
                          }}
                        >
                          <option value="">None</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={handleSave}
                        disabled={saving || !formTitle.trim()}
                        style={{
                          padding: "0.5rem 1rem",
                          fontSize: "1rem",
                          backgroundColor: saving || !formTitle.trim() ? "#ccc" : "#0070f3",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: saving || !formTitle.trim() ? "not-allowed" : "pointer",
                        }}
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        style={{
                          padding: "0.5rem 1rem",
                          fontSize: "1rem",
                          backgroundColor: "#666",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: saving ? "not-allowed" : "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0 }}>{opp.title}</h3>
                      {opp.description && <p style={{ margin: "0.5rem 0", color: "#666" }}>{opp.description}</p>}
                      <div style={{ display: "flex", gap: "1rem", fontSize: "0.875rem", color: "#666" }}>
                        {opp.stage && <span>Stage: {opp.stage}</span>}
                        {opp.priority !== null && (
                          <span style={{ color: getPriorityColor(getPriorityFromNumber(opp.priority)) }}>
                            Priority: {getPriorityFromNumber(opp.priority) ?? "N/A"}
                          </span>
                        )}
                        <span>Status: {opp.status}</span>
                        <span>Created: {formatDate(opp.created_at)}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => startEdit(opp)}
                        disabled={saving}
                        style={{
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.875rem",
                          backgroundColor: "#0070f3",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: saving ? "not-allowed" : "pointer",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(opp.id)}
                        disabled={saving}
                        style={{
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.875rem",
                          backgroundColor: "#dc2626",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: saving ? "not-allowed" : "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* AI Suggestions */}
      <section style={{ marginTop: "2rem" }}>
        <h2>AI Suggestions</h2>
        {data.suggestions.length === 0 ? (
          <p>No AI suggestions found.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {data.suggestions.map((suggestion) => (
              <li key={suggestion.id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0 }}>{suggestion.title}</h3>
                    {suggestion.description && <p style={{ margin: "0.5rem 0", color: "#666" }}>{suggestion.description}</p>}
                    <div style={{ display: "flex", gap: "1rem", fontSize: "0.875rem", color: "#666" }}>
                      <span>Source: {suggestion.source_kind}</span>
                      <span>Created: {formatDate(suggestion.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => convertSuggestion(suggestion)}
                    disabled={saving || showAddForm}
                    style={{
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.875rem",
                      backgroundColor: saving || showAddForm ? "#ccc" : "#0070f3",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: saving || showAddForm ? "not-allowed" : "pointer",
                    }}
                  >
                    Convert to Opportunity
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent Interactions */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Recent Interactions</h2>
        {data.interactions.length === 0 ? (
          <p>No recent interactions found.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {data.interactions.map((interaction) => (
              <li key={interaction.id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "4px" }}>
                <div>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: "bold" }}>{interaction.channel}</span>
                    {interaction.subject && <span style={{ color: "#666" }}>{interaction.subject}</span>}
                    <span style={{ fontSize: "0.875rem", color: "#666" }}>
                      {formatDateTime(interaction.occurred_at)}
                    </span>
                  </div>
                  {interaction.summary && <p style={{ margin: "0.5rem 0" }}>{interaction.summary}</p>}
                  {interaction.next_step && (
                    <p style={{ fontSize: "0.875rem", color: "#666", margin: "0.5rem 0" }}>
                      Next step: {interaction.next_step}
                      {interaction.next_step_due_at && ` (due: ${formatDate(interaction.next_step_due_at)})`}
                    </p>
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

