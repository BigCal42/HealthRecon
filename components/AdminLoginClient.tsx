"use client";

import { useState } from "react";

interface AdminLoginClientProps {
  from: string;
}

export function AdminLoginClient({ from }: AdminLoginClientProps) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, from }),
      });

      const data = (await response.json()) as
        | { ok: true; redirectTo: string }
        | { ok: false; error: string };

      if (data.ok) {
        setStatus("success");
        window.location.href = data.redirectTo;
      } else {
        setError(data.error || "Invalid token");
        setStatus("idle");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "400px", marginTop: "1rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="token" style={{ display: "block", marginBottom: "0.5rem" }}>
          Admin Token:
        </label>
        <input
          id="token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          disabled={status === "loading"}
          style={{
            width: "100%",
            padding: "0.5rem",
            fontSize: "1rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        />
      </div>
      {error && (
        <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        style={{
          padding: "0.5rem 1rem",
          fontSize: "1rem",
          backgroundColor: "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: status === "loading" ? "not-allowed" : "pointer",
        }}
      >
        {status === "loading" ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}

