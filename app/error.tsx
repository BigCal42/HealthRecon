"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error("Global error boundary caught:", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  // Show stack trace if available (typically only in development)
  const hasStack = Boolean(error.stack);

  return (
    <html lang="en" className="dark">
      <body>
        <main className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-2xl w-full space-y-6">
            <div className="border border-red-500/50 rounded-xl p-6 bg-red-500/10">
              <h1 className="text-2xl font-semibold text-red-500 mb-4">
                Something went wrong
              </h1>
              
              <div className="space-y-4">
                <div>
                  <p className="text-foreground font-medium mb-2">Error Message:</p>
                  <p className="text-muted-foreground bg-muted/50 p-3 rounded-lg font-mono text-sm">
                    {error.message || "An unexpected error occurred"}
                  </p>
                </div>

                {error.digest && (
                  <div>
                    <p className="text-foreground font-medium mb-2">Error ID:</p>
                    <p className="text-muted-foreground font-mono text-sm">
                      {error.digest}
                    </p>
                  </div>
                )}

                {hasStack && (
                  <details className="mt-4">
                    <summary className="text-foreground font-medium cursor-pointer mb-2">
                      Stack Trace
                    </summary>
                    <pre className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg overflow-auto max-h-64">
                      {error.stack}
                    </pre>
                  </details>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={reset}
                    className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium"
                  >
                    Try again
                  </button>
                  <Link
                    href="/"
                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted/50 transition-colors text-center font-medium"
                  >
                    Go back home
                  </Link>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    If this error persists, please check:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside space-y-1">
                    <li>Environment variables are configured correctly</li>
                    <li>Database connection is available</li>
                    <li>API services are running</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-4">
                    Check the Vercel deployment logs for more details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}

