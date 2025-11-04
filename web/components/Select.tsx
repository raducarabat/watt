"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    const merged = twMerge(
      "flex h-11 w-full appearance-none rounded-xl border border-neutral-700 bg-neutral-900 px-4 text-sm text-neutral-100 outline-none transition",
      "focus-visible:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:cursor-not-allowed disabled:opacity-60",
      error ? "border-red-500 focus-visible:ring-red-500/60" : "",
      className,
    );

    return (
      <div className="relative">
        <select ref={ref} className={merged} aria-invalid={Boolean(error)} {...props}>
          {children}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400"
        >
          ▾
        </span>
      </div>
    );
  },
);

Select.displayName = "Select";
