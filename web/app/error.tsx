"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/Card";
import { useToast } from "@/components/ToastProvider";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void; }) {
  const { push } = useToast();

  useEffect(() => {
    push({
      intent: "error",
      title: "Something went wrong",
      description: error.message ?? "An unexpected error occurred.",
    });
  }, [error, push]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950">
      <Card className="max-w-lg text-center">
        <CardHeader>
          <CardTitle>Unexpected error</CardTitle>
          <CardDescription>We hit an issue while rendering this page.</CardDescription>
        </CardHeader>

        <div className="space-y-4">
          <p className="text-sm text-neutral-400">
            Try again, or return to the dashboard.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
