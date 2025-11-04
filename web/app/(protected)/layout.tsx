import type { PropsWithChildren } from "react";

export default function ProtectedLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950">{children}</div>
  );
}
