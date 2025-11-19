import { SalesBriefingClient } from "@/components/SalesBriefingClient";

export default function SalesBriefingPage() {
  return (
    <main>
      <h1>Daily Sales Briefing</h1>
      <p>Summaries of recent activity across all systems with suggested focus.</p>
      <SalesBriefingClient />
    </main>
  );
}

