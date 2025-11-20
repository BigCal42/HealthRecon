"use client";

import { useState } from "react";
import Link from "next/link";

import type { TodayFocusResult } from "@/lib/getTodayFocus";
import { logger } from "@/lib/logger.client";
import { UICopy, ITEM_TYPE_LABELS } from "@/lib/uiCopy";

interface FocusClientProps {
  initialFocus: TodayFocusResult;
}

export function FocusClient({ initialFocus }: FocusClientProps) {
  const [focus, setFocus] = useState(initialFocus);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function addToWorklist(item: TodayFocusResult["items"][number]) {
    const key = `${item.type}-${item.id}`;
    if (pendingIds.includes(key)) {
      return;
    }

    setPendingIds((prev) => [...prev, key]);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/worklist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromFocusItem: {
            id: item.id,
            type: item.type,
            systemId: item.systemId,
            title: item.title,
            description: item.description,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        const errorMessage = data.error?.message || "Failed to add to worklist";
        setStatusMessage(`Error: ${errorMessage}`);
        return;
      }

      setStatusMessage(`Added "${item.title}" to worklist`);
      // Clear message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      setStatusMessage("Error: Failed to add to worklist");
      logger.error(error, "Error adding to worklist", { itemId: item.id, itemType: item.type });
    } finally {
      setPendingIds((prev) => prev.filter((id) => id !== key));
    }
  }

  return (
    <div>
      <h1>{UICopy.focus.pageTitle}</h1>
      <p>Date: {focus.date}</p>
      {statusMessage && (
        <p style={{ padding: "0.5rem", backgroundColor: "#e8f5e9", border: "1px solid #4caf50", borderRadius: "4px", marginBottom: "1rem" }}>
          {statusMessage}
        </p>
      )}
      {focus.items.length === 0 ? (
        <p>{UICopy.focus.emptyState}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {focus.items.map((item) => {
            const key = `${item.type}-${item.id}`;
            const isPending = pendingIds.includes(key);
            return (
              <li
                key={key}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  padding: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <p style={{ margin: "0 0 0.5rem 0" }}>
                  <strong>[{ITEM_TYPE_LABELS[item.type] ?? item.type}]</strong>{" "}
                  <Link href={`/systems/${item.systemSlug}`}>{item.systemName}</Link>
                </p>
                <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>{item.title}</p>
                {item.description && (
                  <p style={{ margin: "0 0 0.5rem 0", color: "#666" }}>{item.description}</p>
                )}
                {item.when && (
                  <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9em", color: "#888" }}>
                    When: {new Date(item.when).toLocaleString()}
                  </p>
                )}
                {item.band && (
                  <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9em", color: "#888" }}>
                    Health: {item.band}
                  </p>
                )}
                <button
                  onClick={() => addToWorklist(item)}
                  disabled={isPending}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: isPending ? "#ccc" : "#4caf50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isPending ? "not-allowed" : "pointer",
                  }}
                >
                  {isPending ? "Adding..." : "Add to Worklist"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

