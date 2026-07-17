import Link from "next/link";

const GUIDES = [
  {
    label: "WhatsApp",
    icon: "forum",
    description: "Export a WhatsApp chat as a plain-text file.",
    href: "/tutorials/whatsapp",
  },
  {
    label: "LINE",
    icon: "chat_bubble",
    description: "Export a LINE chat as a plain-text file.",
    href: "/tutorials/line",
  },
];

export default function TutorialHubPage() {
  return (
    <div className="flex flex-1 justify-center px-5 pt-24 pb-32 md:px-12 md:pt-4 md:pb-16">
      <main className="flex w-full max-w-[800px] flex-col gap-6">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back home
        </Link>

        <section className="rounded-xl bg-primary p-6 text-on-primary shadow-soft-card md:p-10">
          <span className="mb-3 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider md:text-xs">
            Export guide
          </span>
          <h1 className="text-[26px] font-extrabold leading-tight md:text-[36px]">
            How do you want to export your chat?
          </h1>
          <p className="mt-2 max-w-lg text-[14px] leading-snug opacity-90 md:text-base">
            Pick your platform for a step-by-step walkthrough of exporting a
            plain-text chat file.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {GUIDES.map((guide) => (
            <Link
              key={guide.label}
              href={guide.href}
              className="group flex items-center gap-4 rounded-xl bg-surface-card p-5 shadow-soft-card transition-all hover:-translate-y-0.5 md:p-6"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-container">
                <span
                  className="material-symbols-outlined text-[24px] text-on-primary-container"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {guide.icon}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-on-surface">{guide.label}</h2>
                <p className="mt-0.5 text-xs text-on-surface-variant">{guide.description}</p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant transition-transform group-hover:translate-x-1">
                chevron_right
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
