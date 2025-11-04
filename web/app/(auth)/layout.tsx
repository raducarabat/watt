import type { PropsWithChildren } from "react";

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950">
      <div className="w-full max-w-xl rounded-3xl border border-neutral-800 bg-neutral-900 px-6 py-12 text-neutral-100 shadow-2xl backdrop-blur">
        {children}
      </div>
    </div>
  );
}
