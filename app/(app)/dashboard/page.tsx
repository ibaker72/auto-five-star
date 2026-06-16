import { getCurrentUser } from "@/lib/auth/supabase-server";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  return (
    <main className="container mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as {user?.email ?? "unknown"}.
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        Inbox + AI drafts ship in later PRs.
      </p>
    </main>
  );
}
