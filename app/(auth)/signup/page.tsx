import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <main className="container mx-auto flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            AutoFiveStar
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Never leave another review unanswered</CardTitle>
            <CardDescription>
              14-day free trial. No charge until day 15.
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
      </div>
    </main>
  );
}
