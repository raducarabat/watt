"use client";

import type { PropsWithChildren, TableHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export function Table(props: TableHTMLAttributes<HTMLTableElement>) {
  const { className, children, ...rest } = props;
  return (
    <div className="overflow-x-auto">
      <table
        className={twMerge(
          "w-full border-collapse text-left text-sm text-neutral-100",
          "rounded-2xl border border-neutral-800 shadow-card",
          className,
        )}
        {...rest}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <thead
      className={twMerge(
        "bg-neutral-900 text-xs uppercase tracking-wide text-neutral-400",
        className,
      )}
    >
      {children}
    </thead>
  );
}

export function TableHeaderCell({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <th className={twMerge("px-4 py-3 font-semibold", className)}>{children}</th>;
}

export function TableBody({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <tbody className={twMerge("divide-y divide-neutral-800", className)}>{children}</tbody>;
}

export function TableRow({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <tr className={twMerge("transition hover:bg-neutral-800/70 focus-within:bg-neutral-800/90", className)}>
      {children}
    </tr>
  );
}

export function TableCell({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <td className={twMerge("px-4 py-3 align-middle text-neutral-200", className)}>{children}</td>;
}
