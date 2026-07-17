"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { label: "Analysis", href: "/" },
  { label: "History", href: "/history" },
  { label: "Settings", href: null },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AccountMenu() {
  const { email, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    setOpen(false);
    router.replace("/login");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container"
      >
        <span className="material-symbols-outlined text-primary">person</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl bg-surface-card p-3 shadow-soft-card">
            {email && (
              <p className="truncate px-2 pb-2 text-xs text-on-surface-variant">{email}</p>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-lg px-2 py-2 text-left text-sm font-bold text-on-surface transition-colors hover:bg-surface-container"
            >
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop / wide-screen airy header */}
      <header className="hidden md:block w-full bg-transparent">
        <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-12 py-10">
          <div className="flex items-center gap-16">
            <span className="text-[32px] font-extrabold tracking-tight text-primary">
              Gabriel
            </span>
            <div className="ml-6 flex gap-10">
              {NAV_ITEMS.map((item) =>
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={
                      isActive(pathname, item.href)
                        ? "rounded-full bg-primary-container px-4 py-2 text-sm font-bold text-on-primary-container"
                        : "pb-1 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
                    }
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    key={item.label}
                    className="cursor-not-allowed pb-1 text-sm font-semibold text-on-surface-variant/40"
                    title="Coming soon"
                  >
                    {item.label}
                  </span>
                )
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container active:scale-95"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <AccountMenu />
          </div>
        </nav>
      </header>

      {/* Mobile fixed top bar */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-background/80 px-5 py-4 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span
              className="material-symbols-outlined text-[20px] text-on-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              analytics
            </span>
          </div>
          <span className="text-[22px] font-extrabold tracking-tight text-primary">
            Gabriel
          </span>
        </div>
        <AccountMenu />
      </header>
    </>
  );
}
