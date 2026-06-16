import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/supabase-server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return renderLanding();
}

function renderLanding() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
      <span className="mb-6 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
        AutoFiveStar · MVP
      </span>
      <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
        Never leave another Google review unanswered.
      </h1>
      <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground">
        AutoFiveStar uses AI to draft professional, on-brand replies to your
        customer reviews so you can approve and post in seconds.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/signup"
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Start Free Trial
        </Link>
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center rounded-md border bg-background px-6 text-sm font-medium hover:bg-secondary"
        >
          Log In
        </Link>
      </div>
      <p className="mt-12 text-xs text-muted-foreground">
        Public landing page ships in Week 4. This is a placeholder.
      </p>
    </main>
  );
}
