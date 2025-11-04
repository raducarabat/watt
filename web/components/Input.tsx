"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    const merged = twMerge(
      "flex h-11 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none transition",
      "focus-visible:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-500 disabled:cursor-not-allowed disabled:opacity-60",
      error ? "border-red-500 focus-visible:ring-red-500/60" : "",
      className,
    );

    return <input ref={ref} className={merged} aria-invalid={Boolean(error)} {...props} />;
  },
);

Input.displayName = "Input";
