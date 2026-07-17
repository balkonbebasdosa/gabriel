"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Analysis", icon: "insights", href: "/analyze" },
  { label: "History", icon: "history", href: "/history" },
  { label: "Settings", icon: "settings", href: null },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-4 bottom-6 z-50 md:hidden">
      <nav className="flex items-center justify-around rounded-full border border-white/20 bg-white/95 py-3 shadow-playful-button backdrop-blur-xl">
        {NAV_ITEMS.map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center ${
                isActive(pathname, item.href) ? "text-primary" : "text-on-surface-variant"
              }`}
            >
              <div
                className={`mb-0.5 flex h-10 w-12 items-center justify-center rounded-full ${
                  isActive(pathname, item.href) ? "bg-primary-container" : ""
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: isActive(pathname, item.href) ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tight">
                {item.label}
              </span>
            </Link>
          ) : (
            <span
              key={item.label}
              className="flex cursor-not-allowed flex-col items-center justify-center text-on-surface-variant/40"
              title="Coming soon"
            >
              <div className="mb-0.5 flex h-10 w-12 items-center justify-center rounded-full">
                <span className="material-symbols-outlined">{item.icon}</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tight">
                {item.label}
              </span>
            </span>
          )
        )}
      </nav>
    </div>
  );
}
