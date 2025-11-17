"use client";

import { useState } from "react";

interface CompareClientProps {
  systems: { slug: string; name: string }[];
}

type ComparisonResult = {
  systemA: { summary: string };
  systemB: { summary: string };
  similarities: string[];
  differences: string[];
  opportunities_for_systemA: string[];
  opportunities_for_systemB: string[];
};

export function CompareClient({ systems }: CompareClientProps) {
  const [systemA, setSystemA] = useState<string>("");
  const [systemB, setSystemB] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!systemA || !systemB) {
      setError("Please select both systems");
      return;
    }

    if (systemA === systemB) {
      setError("Please select two different systems");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/compare-systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemA, systemB }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to compare systems");
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Compare Systems</h1>
      <p>Select two healthcare systems to generate an AI-powered comparison.</p>

      <div style={{ marginTop: "2rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="systemA" style={{ display: "block", marginBottom: "0.5rem" }}>
            System A:
          </label>
          <select
            id="systemA"
            value={systemA}
            onChange={(e) => setSystemA(e.target.value)}
            disabled={loading}
            style={{ width: "100%", maxWidth: "400px", padding: "0.5rem" }}
          >
            <option value="">Select a system</option>
            {systems.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="systemB" style={{ display: "block", marginBottom: "0.5rem" }}>
            System B:
          </label>
          <select
            id="systemB"
            value={systemB}
            onChange={(e) => setSystemB(e.target.value)}
            disabled={loading}
            style={{ width: "100%", maxWidth: "400px", padding: "0.5rem" }}
          >
            <option value="">Select a system</option>
            {systems.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <button onClick={handleCompare} disabled={loading || !systemA || !systemB}>
            {loading ? "Comparing..." : "Compare"}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: "1rem", color: "#d32f2f" }}>
            <p>Error: {error}</p>
          </div>
        )}

        {result && (
          <div style={{ marginTop: "2rem" }}>
            <h2>Comparison Results</h2>

            <section style={{ marginTop: "1.5rem" }}>
              <h3>System A Summary</h3>
              <p>{result.systemA.summary}</p>
            </section>

            <section style={{ marginTop: "1.5rem" }}>
              <h3>System B Summary</h3>
              <p>{result.systemB.summary}</p>
            </section>

            <section style={{ marginTop: "1.5rem" }}>
              <h3>Similarities</h3>
              {result.similarities.length > 0 ? (
                <ul>
                  {result.similarities.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>No similarities identified.</p>
              )}
            </section>

            <section style={{ marginTop: "1.5rem" }}>
              <h3>Differences</h3>
              {result.differences.length > 0 ? (
                <ul>
                  {result.differences.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>No differences identified.</p>
              )}
            </section>

            <section style={{ marginTop: "1.5rem" }}>
              <h3>Opportunities for System A</h3>
              {result.opportunities_for_systemA.length > 0 ? (
                <ul>
                  {result.opportunities_for_systemA.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>No opportunities identified.</p>
              )}
            </section>

            <section style={{ marginTop: "1.5rem" }}>
              <h3>Opportunities for System B</h3>
              {result.opportunities_for_systemB.length > 0 ? (
                <ul>
                  {result.opportunities_for_systemB.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>No opportunities identified.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

