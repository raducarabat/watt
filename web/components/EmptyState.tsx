"use client";

import type { PropsWithChildren } from "react";
import { twMerge } from "tailwind-merge";

interface EmptyStateProps extends PropsWithChildren {
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ title, description, className, children }: EmptyStateProps) {
  return (
    <div
      className={twMerge(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-700 bg-neutral-900 p-10 text-center text-sm text-neutral-400",
        className,
      )}
    >
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
