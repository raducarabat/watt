import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/Card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/70 dark:bg-slate-950">
      <Card className="max-w-md text-center">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>The page you&apos;re looking for doesn&apos;t exist.</CardDescription>
        </CardHeader>
        <div className="flex justify-center">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          >
            Back to dashboard
          </Link>
        </div>
      </Card>
    </div>
  );
}
