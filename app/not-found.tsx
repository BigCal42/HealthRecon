import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <h1>404 – Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <p>
        <Link href="/">Go back home</Link>
      </p>
    </main>
  );
}

