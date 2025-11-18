"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
  ok: boolean;
  supabase: string;
  openaiConfigured: boolean;
  firecrawlConfigured: boolean;
  timestamp: string;
};

export function HealthClient() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json: HealthResponse) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Health check failed");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Checking...</p>;
  }

  if (error) {
    return <p>Health check failed</p>;
  }

  if (!data) {
    return <p>No data received</p>;
  }

  return (
    <div>
      <p>Status: {data.ok ? "OK" : "ERROR"}</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

