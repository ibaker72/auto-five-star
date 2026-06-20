import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandGlow } from "@/components/ui/brand-glow";
import { AuthFooter } from "@/components/marketing/auth-footer";
import { Logo } from "@/components/brand/logo";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <BrandGlow intensity="subtle" />
      <div className="relative w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Link href="/" aria-label="AutoFiveStar home">
            <Logo markSize={36} wordmarkClassName="text-2xl" />
          </Link>
        </div>
        <Card className="shadow-card-lift">
          <CardHeader>
            <CardTitle>Never leave another review unanswered</CardTitle>
            <CardDescription>
              7-day free trial. No charge until day 8.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={<div className="h-40" aria-hidden="true" />}
            >
              <SignupForm />
            </Suspense>
          </CardContent>
        </Card>
        <AuthFooter />
      </div>
    </main>
  );
}
