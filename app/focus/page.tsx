import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getTodayFocus } from "@/lib/getTodayFocus";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  const supabase = createServerSupabaseClient();
  const today = new Date();
  const focus = await getTodayFocus(supabase, today);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Today&apos;s Focus</h1>
      <p>Date: {focus.date}</p>
      {focus.items.length === 0 ? (
        <p>No prioritized items for today. Check systems, signals, or opportunities.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {focus.items.map((item) => (
            <li
              key={`${item.type}-${item.id}`}
              style={{
                border: "1px solid #ddd",
                borderRadius: "4px",
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <p style={{ margin: "0 0 0.5rem 0" }}>
                <strong>[{item.type}]</strong>{" "}
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
                <p style={{ margin: 0, fontSize: "0.9em", color: "#888" }}>
                  Health: {item.band}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

