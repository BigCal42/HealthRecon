import { GlobalStrategyClient } from "@/components/GlobalStrategyClient";

export default async function GlobalStrategyPage() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Global Strategy Dashboard</h1>
      <p>
        Synthesize cross-system intelligence into portfolio-wide strategic themes, risks, and recommendations.
      </p>
      <GlobalStrategyClient />
    </main>
  );
}

