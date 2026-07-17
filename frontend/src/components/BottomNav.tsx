import Link from "next/link";

const NAV_ITEMS = [
  { label: "Analysis", icon: "insights", active: true },
  { label: "History", icon: "history", active: false },
  { label: "Settings", icon: "settings", active: false },
];

export function BottomNav() {
  return (
    <div className="fixed inset-x-4 bottom-6 z-50 md:hidden">
      <nav className="flex items-center justify-around rounded-full border border-white/20 bg-white/95 py-3 shadow-playful-button backdrop-blur-xl">
        {NAV_ITEMS.map((item) =>
          item.active ? (
            <Link
              key={item.label}
              href="/"
              className="flex flex-col items-center justify-center text-primary"
            >
              <div className="mb-0.5 flex h-10 w-12 items-center justify-center rounded-full bg-primary-container">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
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
