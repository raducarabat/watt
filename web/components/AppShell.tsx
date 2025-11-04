"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/Button";
import type { logoutAction } from "@/app/(protected)/actions";
import { DASHBOARD_ROUTE } from "@/lib/constants";

interface AppShellProps {
  children: React.ReactNode;
  userName?: string;
  isAdmin?: boolean;
  onLogout: typeof logoutAction;
}

const NAV_ITEMS = [
  { href: DASHBOARD_ROUTE, label: "Dashboard" },
  { href: "/admin", label: "Admin", adminOnly: true },
];

export function AppShell({ children, userName, isAdmin, onLogout }: AppShellProps) {
  const pathname = usePathname();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(() => {
      onLogout();
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href={DASHBOARD_ROUTE} className="text-lg font-semibold text-white">
            Watt Energy
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            {NAV_ITEMS.filter((item) => (item.adminOnly ? isAdmin : true)).map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`transition ${isActive ? "text-white" : "text-neutral-400 hover:text-neutral-100"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-sm">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-sm font-semibold text-white">
                {userName?.charAt(0).toUpperCase() ?? "?"}
              </span>
              <span className="text-neutral-400">{userName ?? "User"}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} isLoading={isPending}>
              Sign out
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setIsNavOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={isNavOpen}
          >
            ☰
          </button>
        </div>

        {isNavOpen && (
          <div className="border-t border-neutral-800 bg-neutral-900 px-6 py-4 shadow-sm md:hidden">
            <nav className="flex flex-col gap-4 text-sm font-medium">
              {NAV_ITEMS.filter((item) => (item.adminOnly ? isAdmin : true)).map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`transition ${isActive ? "text-white" : "text-neutral-400 hover:text-neutral-100"}`}
                    onClick={() => setIsNavOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Button variant="outline" size="sm" onClick={handleLogout} isLoading={isPending}>
                Sign out
              </Button>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
