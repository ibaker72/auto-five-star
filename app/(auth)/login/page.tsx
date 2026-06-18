import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandGlow } from "@/components/ui/brand-glow";
import { AuthFooter } from "@/components/marketing/auth-footer";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <BrandGlow intensity="subtle" />
      <div className="relative w-full max-w-md space-y-6">
        <div className="text-center">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-brand-gradient"
          >
            AutoFiveStar
          </Link>
        </div>
        <Card className="shadow-card-lift">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Log in to keep your reviews answered.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={<div className="h-40" aria-hidden="true" />}
            >
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
        <AuthFooter />
      </div>
    </main>
  );
}
