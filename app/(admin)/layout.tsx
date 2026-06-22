import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";

/**
 * Admin-only route group. Any unauthenticated or non-allowlisted user gets a
 * 404 (notFound) rather than a redirect, so we don't advertise that admin
 * surfaces exist. Allowlist is driven by ADMIN_EMAILS.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();
  if (!admin) notFound();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-muted/30">
        <div className="container mx-auto flex items-center justify-between px-6 py-3">
          <span className="text-sm font-semibold">AutoFiveStar · Admin</span>
          <span className="text-xs text-muted-foreground">{admin.email}</span>
        </div>
      </div>
      <div className="container mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
