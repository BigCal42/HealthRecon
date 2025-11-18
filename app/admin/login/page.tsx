import { AdminLoginClient } from "@/components/AdminLoginClient";

type AdminLoginPageProps = {
  searchParams: Promise<{ from?: string }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = await searchParams;
  const from = params.from ?? "/admin/systems";

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Admin Login</h1>
      <AdminLoginClient from={from} />
    </main>
  );
}

