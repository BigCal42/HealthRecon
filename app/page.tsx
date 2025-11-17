import Link from "next/link";
import { BILH_SLUG } from "@/config/constants";

export default function Home() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>HealthRecon</h1>
      <p>
        Personal intelligence layer for healthcare systems, starting with Beth
        Israel Lahey Health (BILH).
      </p>
      <Link href={`/systems/${BILH_SLUG}`}>View BILH System →</Link>
    </div>
  );
}

