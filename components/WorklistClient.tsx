"use client";

import { useState } from "react";
import Link from "next/link";

import { logger } from "@/lib/logger.client";
import { UICopy } from "@/lib/uiCopy";

interface WorklistClientProps {
  initialItems: Array<{
    id: string;
    systemSlug: string;
    systemName: string;
    title: string;
    description: string | null;
    status: string;
    dueAt: string | null;
  }>;
}

export function WorklistClient({ initialItems }: WorklistClientProps) {
  const [items, setItems] = useState(initialItems);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  async function updateStatus(id: string, status: string, snoozeDays?: number) {
    if (updatingIds.includes(id)) {
      return;
    }

    setUpdatingIds((prev) => [...prev, id]);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/worklist/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          snoozeDays,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        const errorMessage = data.error?.message || "Failed to update status";
        setStatusMessage(`Error: ${errorMessage}`);
        return;
      }

      // Update local state - remove item if done or dropped, otherwise update it
      if (status === "done" || status === "dropped") {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setStatusMessage(`Marked as ${status}`);
      } else {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: data.data.item.status,
                  dueAt: data.data.item.due_at,
                }
              : item,
          ),
        );
        setStatusMessage(`Status updated to ${status}`);
      }

      // Clear message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      setStatusMessage("Error: Failed to update status");
      logger.error(error, "Error updating status", { id, status });
    } finally {
      setUpdatingIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  }

  return (
    <div>
      <h1>{UICopy.worklist.pageTitle}</h1>
      {statusMessage && (
        <p style={{ padding: "0.5rem", backgroundColor: "#e8f5e9", border: "1px solid #4caf50", borderRadius: "4px", marginBottom: "1rem" }}>
          {statusMessage}
        </p>
      )}
      {items.length === 0 ? (
        <p>{UICopy.worklist.emptyState}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {items.map((item) => {
            const isUpdating = updatingIds.includes(item.id);
            return (
              <li
                key={item.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  padding: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <p style={{ margin: "0 0 0.5rem 0" }}>
                  <Link href={`/systems/${item.systemSlug}`}>{item.systemName}</Link>
                </p>
                <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>{item.title}</p>
                {item.description && (
                  <p style={{ margin: "0 0 0.5rem 0", color: "#666" }}>{item.description}</p>
                )}
                {item.dueAt && (
                  <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9em", color: "#888" }}>
                    Due: {new Date(item.dueAt).toLocaleString()}
                  </p>
                )}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    onClick={() => updateStatus(item.id, "done")}
                    disabled={isUpdating}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: isUpdating ? "#ccc" : "#4caf50",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: isUpdating ? "not-allowed" : "pointer",
                    }}
                  >
                    Done
                  </button>
                  <button
                    onClick={() => updateStatus(item.id, "snoozed", 1)}
                    disabled={isUpdating}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: isUpdating ? "#ccc" : "#ff9800",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: isUpdating ? "not-allowed" : "pointer",
                    }}
                  >
                    Snooze 1 day
                  </button>
                  <button
                    onClick={() => updateStatus(item.id, "dropped")}
                    disabled={isUpdating}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: isUpdating ? "#ccc" : "#f44336",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: isUpdating ? "not-allowed" : "pointer",
                    }}
                  >
                    Drop
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

