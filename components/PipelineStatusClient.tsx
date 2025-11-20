"use client";

interface PipelineRun {
  id: string;
  system_id: string | null;
  status: string;
  ingest_created: number | null;
  process_processed: number | null;
  error_message: string | null;
  created_at: string;
}

interface BriefingRun {
  id: string;
  system_id: string;
  status: string;
  briefing_id: string | null;
  error_message: string | null;
  created_at: string;
}

interface PipelineStatusClientProps {
  initialPipelineRuns: PipelineRun[];
  initialBriefingRuns: BriefingRun[];
  systemMap: Record<string, { slug: string; name: string }>;
}

export function PipelineStatusClient({
  initialPipelineRuns,
  initialBriefingRuns,
  systemMap,
}: PipelineStatusClientProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "#4caf50";
      case "error":
        return "#f44336";
      case "no_recent_activity":
        return "#ff9800";
      default:
        return "#666";
    }
  };

  const getSystemName = (systemId: string | null) => {
    if (!systemId) return "Unknown";
    const system = systemMap[systemId];
    return system ? `${system.name} (${system.slug})` : systemId.substring(0, 8);
  };

  return (
    <div>
      <h2>Recent Pipeline Runs</h2>
      <div style={{ marginBottom: "2rem" }}>
        {initialPipelineRuns.length === 0 ? (
          <p>No pipeline runs found.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Time</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>System</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Status</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Docs Created</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Docs Processed</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Error</th>
              </tr>
            </thead>
            <tbody>
              {initialPipelineRuns.map((run) => (
                <tr key={run.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.75rem" }}>
                    {new Date(run.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.75rem" }}>{getSystemName(run.system_id)}</td>
                  <td style={{ padding: "0.75rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        backgroundColor: getStatusColor(run.status),
                        color: "white",
                        fontSize: "0.9rem",
                      }}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    {run.ingest_created !== null ? run.ingest_created : "-"}
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    {run.process_processed !== null ? run.process_processed : "-"}
                  </td>
                  <td style={{ padding: "0.75rem", color: "#f44336", fontSize: "0.9rem" }}>
                    {run.error_message ? run.error_message.substring(0, 100) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>Recent Briefing Runs</h2>
      <div>
        {initialBriefingRuns.length === 0 ? (
          <p>No briefing runs found.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Time</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>System</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Status</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Briefing ID</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>Error</th>
              </tr>
            </thead>
            <tbody>
              {initialBriefingRuns.map((run) => (
                <tr key={run.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.75rem" }}>
                    {new Date(run.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.75rem" }}>{getSystemName(run.system_id)}</td>
                  <td style={{ padding: "0.75rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        backgroundColor: getStatusColor(run.status),
                        color: "white",
                        fontSize: "0.9rem",
                      }}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    {run.briefing_id ? run.briefing_id.substring(0, 8) + "..." : "-"}
                  </td>
                  <td style={{ padding: "0.75rem", color: "#f44336", fontSize: "0.9rem" }}>
                    {run.error_message ? run.error_message.substring(0, 100) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

