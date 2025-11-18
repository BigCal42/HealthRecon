"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <main>
          <h1>Something went wrong</h1>
          <p>{error.message}</p>
          <button onClick={() => reset()}>Try again</button>
          <p>
            <Link href="/">Go back home</Link>
          </p>
        </main>
      </body>
    </html>
  );
}

