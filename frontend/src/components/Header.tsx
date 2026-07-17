import Link from "next/link";

const NAV_ITEMS = [
  { label: "Analysis", active: true },
  { label: "History", active: false },
  { label: "Settings", active: false },
];

export function Header() {
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
                item.active ? (
                  <Link
                    key={item.label}
                    href="/"
                    className="rounded-full bg-primary-container px-4 py-2 text-sm font-bold text-on-primary-container"
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container">
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
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
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container">
          <span className="material-symbols-outlined text-primary">person</span>
        </div>
      </header>
    </>
  );
}
