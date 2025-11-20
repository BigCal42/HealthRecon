"use client";

import { useState } from "react";

export function HeroDemoPipelineButton({ slug }: { slug: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function runPipeline() {
    try {
      setPending(true);
      setStatus("Running pipeline...");
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });

      const json = await res.json();
      if (!res.ok || json.ok === false) {
        setStatus("Pipeline failed or returned an error.");
        return;
      }
      setStatus("Pipeline completed successfully.");
    } catch (e) {
      setStatus("Error running pipeline.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button onClick={runPipeline} disabled={pending}>
        {pending ? "Running..." : "Run Pipeline for this System"}
      </button>
      {status && <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>{status}</p>}
    </div>
  );
}

