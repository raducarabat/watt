"use client";

import { twMerge } from "tailwind-merge";

interface LoaderProps {
  label?: string;
  className?: string;
}

export function Loader({ label = "Loading", className }: LoaderProps) {
  return (
    <div className={twMerge("flex items-center gap-3 text-sm text-neutral-400", className)}>
      <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
      <span>{label}&hellip;</span>
    </div>
  );
}
