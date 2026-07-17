# Results Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the frontend's visual system with a warmer, color-blocked-card look, and render two pieces of data the backend already returns but the UI currently discards: per-participant role classification (`conclusion`) and click-to-preview for `message #N` references.

**Architecture:** Pure frontend change, no backend/API-contract changes. Four files gain a new `conclusion` field on the existing `AnalysisResult` type; `page.tsx` starts retaining the submitted transcript in state so `StageTimeline` can look up original message text by index; `StageTimeline.tsx` gets a restyled progression header, a new participants section, and click-to-expand message references; `TranscriptUploadForm.tsx`/`Header.tsx`/`BottomNav.tsx` get cosmetic-only restyles to the same warm palette.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 (`@theme inline` tokens in `globals.css`).

## Testing approach

This frontend has no unit-test framework (`package.json` has no test script; verification has always been `tsc --noEmit` + `npm run lint` + `npm run build` + manual browser check — see every prior `HANDOFF.md` entry for this codebase). This plan does not introduce one; that would be unrequested infrastructure scope creep. Where a step below says "run to verify it fails," it means running `npx tsc --noEmit`, using the type checker as the correctness gate in place of a test runner — this works cleanly here because Task 2's steps are ordered so an incomplete change is a real type error, not a silent gap.

## Global Constraints

- Stage colors stay semantic, not decorative: fixed green → orange → purple → red mapping for trust_building → risk_assessment → isolation_secrecy → desensitization, everywhere they appear (progress bar, chips, message-preview accent). Never restyle per-section like the reference's arbitrary pastel choices.
- No new fonts or icon libraries — reuse Plus Jakarta Sans (`--font-sans`) and Material Symbols Outlined, already loaded in `layout.tsx`.
- No new routes/pages — `History`/`Settings` in `Header.tsx`/`BottomNav.tsx` stay disabled placeholders.
- No backend or `docs/api-contract.md` changes — `conclusion` is already implemented and returned by the real backend/ai-service today.
- Role values (`target_victim`, `active_participant`, `bystander`, `mediator`, `unclear`) render as-is — never relabeled or given additional interpretive text, matching the project's non-negotiable "descriptive, not an accusation" framing already applied to `stage`.
- `progression_score` is never rendered as a bare percentage anywhere (pre-existing constraint from `docs/api-contract.md` — must not regress while touching this file).

---

### Task 1: Data model — `conclusion` type + mock fixture

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/mock.ts`
- Test: none (no frontend test framework — see Testing approach above). Verified via `npx tsc --noEmit`.

**Interfaces:**
- Produces: `Participant` (`{ speaker: string; role: ParticipantRole; behavior_summary: string }`), `ParticipantRole` (union of the 5 values above), `Conclusion` (`{ participants: Participant[]; person_of_interest_summary: Participant | null }`), and `AnalysisResult.conclusion: Conclusion` (new required field). Task 2 consumes all of these from `@/lib/types`.

- [ ] **Step 1: Add the new types and the `conclusion` field to `types.ts`**

Replace the full contents of `frontend/src/lib/types.ts` with:

```ts
export type Speaker = string;

export interface TranscriptMessage {
  speaker: Speaker;
  message: string;
  timestamp: string;
}

export type Stage =
  | "trust_building"
  | "risk_assessment"
  | "isolation_secrecy"
  | "desensitization";

export const STAGES: Stage[] = [
  "trust_building",
  "risk_assessment",
  "isolation_secrecy",
  "desensitization",
];

export const STAGE_LABELS: Record<Stage, string> = {
  trust_building: "Trust building",
  risk_assessment: "Risk assessment",
  isolation_secrecy: "Isolation / secrecy",
  desensitization: "Desensitization",
};

export interface AnalysisSegment {
  message_index: number;
  stage: Stage;
  confidence: number;
  rationale: string;
}

export type ParticipantRole =
  | "target_victim"
  | "active_participant"
  | "bystander"
  | "mediator"
  | "unclear";

export interface Participant {
  speaker: Speaker;
  role: ParticipantRole;
  behavior_summary: string;
}

export interface Conclusion {
  participants: Participant[];
  person_of_interest_summary: Participant | null;
}

export interface AnalysisResult {
  id?: string;
  transcript_id?: string;
  created_at?: string;
  segments: AnalysisSegment[];
  progression_score: number;
  stages_reached: Stage[];
  summary: string;
  conclusion: Conclusion;
}

export interface TranscriptCreatedResponse {
  id: string;
  created_at: string;
  message_count: number;
}
```

- [ ] **Step 2: Run the type checker to verify it fails**

Run: `cd frontend && npx tsc --noEmit`
Expected: FAIL — error in `src/lib/mock.ts` along the lines of `Property 'conclusion' is missing in type ... but required in type 'AnalysisResult'`. This confirms `mock.ts` is the only other place that constructs an `AnalysisResult`, and it needs updating.

- [ ] **Step 3: Add `conclusion` to the mock fixture**

Replace the full contents of `frontend/src/lib/mock.ts` with:

```ts
import { AnalysisResult } from "./types";

/**
 * Fixture used only when NEXT_PUBLIC_BACKEND_URL is unset, so the dashboard is
 * demoable before the backend/ai-service are wired up (see repo HANDOFF.md
 * stub-first rule). Not real analysis output.
 */
export const MOCK_ANALYSIS_RESULT: AnalysisResult = {
  segments: [
    {
      message_index: 0,
      stage: "trust_building",
      confidence: 0.62,
      rationale: "casual rapport-building, no risk indicators",
    },
    {
      message_index: 4,
      stage: "risk_assessment",
      confidence: 0.55,
      rationale: "asks whether parents check the child's phone",
    },
    {
      message_index: 9,
      stage: "isolation_secrecy",
      confidence: 0.71,
      rationale: "requests the conversation move to a private, unmonitored app",
    },
  ],
  progression_score: 0.54,
  stages_reached: ["trust_building", "risk_assessment", "isolation_secrecy"],
  summary:
    "conversation escalated from rapport-building to a request for secrecy; no desensitization stage detected yet",
  conclusion: {
    participants: [
      {
        speaker: "A",
        role: "active_participant",
        behavior_summary:
          "mock behavior summary — stub response for local development, not a real behavior assessment",
      },
      {
        speaker: "B",
        role: "unclear",
        behavior_summary:
          "mock behavior summary — stub response for local development, not a real behavior assessment",
      },
    ],
    person_of_interest_summary: null,
  },
};
```

- [ ] **Step 4: Run the type checker to verify it passes**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS — no output, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/types.ts frontend/src/lib/mock.ts
git commit -m "Add conclusion (participant roles) to AnalysisResult type and mock fixture"
```

---

### Task 2: Results screen — progression header, participants section, message preview

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/components/StageTimeline.tsx`
- Test: none (no frontend test framework). Verified via `npx tsc --noEmit`, `npm run lint`, `npm run build`, and manual browser check.

**Interfaces:**
- Consumes: `Participant`, `Conclusion`, `AnalysisResult` (now with `conclusion`), `TranscriptMessage`, `STAGES`, `STAGE_LABELS`, `Stage` from `@/lib/types` (Task 1); `analyzeTranscript` from `@/lib/api` (unchanged).
- Produces: `StageTimelineProps` now requires `transcript: TranscriptMessage[]` in addition to the existing `result: AnalysisResult`. Any future caller of `<StageTimeline>` must pass both.

- [ ] **Step 1: Add two new pastel background tokens to `globals.css`**

In `frontend/src/app/globals.css`, insert these two lines inside the `@theme inline { ... }` block, immediately after the `--color-on-error-container: #93000a;` line and before the `/* Rounded, "soft geometry" shape language */` comment:

```css
  /* Warm pastel section backgrounds — results screen redesign */
  --color-progression-bg: #fdeedc;
  --color-poi-bg: #eaf6e3;
```

- [ ] **Step 2: Update `StageTimeline.tsx` to require the new `transcript` prop and render the new sections (this will not compile yet — that's expected, `page.tsx` hasn't been updated)**

Replace the full contents of `frontend/src/components/StageTimeline.tsx` with:

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  AnalysisResult,
  Participant,
  STAGES,
  STAGE_LABELS,
  Stage,
  TranscriptMessage,
} from "@/lib/types";

interface StageTimelineProps {
  result: AnalysisResult;
  transcript: TranscriptMessage[];
}

const STAGE_ACCENT: Record<
  Stage,
  { bar: string; chip: string; icon: string }
> = {
  trust_building: {
    bar: "bg-tertiary",
    chip: "bg-tertiary text-on-tertiary",
    icon: "border-tertiary",
  },
  risk_assessment: {
    bar: "bg-secondary-container",
    chip: "bg-secondary-container text-on-secondary",
    icon: "border-secondary-container",
  },
  isolation_secrecy: {
    bar: "bg-quaternary-container",
    chip: "bg-quaternary-container text-on-quaternary",
    icon: "border-quaternary-container",
  },
  desensitization: {
    bar: "bg-error",
    chip: "bg-error text-on-error",
    icon: "border-error",
  },
};

function ParticipantRow({
  participant,
  highlight,
}: {
  participant: Participant;
  highlight: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg p-3 ${
        highlight ? "bg-poi-bg" : "bg-progression-bg"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          highlight
            ? "bg-tertiary text-on-tertiary"
            : "bg-secondary-container text-on-secondary"
        }`}
      >
        {participant.speaker.slice(0, 1).toUpperCase()}
      </span>
      <div>
        <p className="text-xs font-bold text-on-surface">
          {participant.speaker} · {participant.role}
        </p>
        <p className="text-xs text-on-surface-variant">
          {participant.behavior_summary}
        </p>
      </div>
    </div>
  );
}

/**
 * Renders the four-stage progression as a timeline with per-segment
 * rationale. progression_score is never shown as a bare percentage — that
 * framing is called out as non-negotiable in docs/api-contract.md.
 */
export function StageTimeline({ result, transcript }: StageTimelineProps) {
  const reached = new Set(result.stages_reached);
  const isHighRisk =
    reached.has("isolation_secrecy") || reached.has("desensitization");
  const segmentsByStage = new Map<Stage, typeof result.segments>();
  for (const segment of result.segments) {
    const existing = segmentsByStage.get(segment.stage) ?? [];
    existing.push(segment);
    segmentsByStage.set(segment.stage, existing);
  }

  const messagesByIndex = useMemo(() => {
    const map = new Map<number, TranscriptMessage>();
    transcript.forEach((message, index) => map.set(index, message));
    return map;
  }, [transcript]);

  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(
    new Set()
  );

  function toggleExpanded(index: number) {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl bg-progression-bg p-4 shadow-soft-card md:p-6">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          Progression
        </h2>
        <p className="mt-1 text-2xl font-extrabold text-on-surface md:text-[28px]">
          Stage {result.stages_reached.length} of {STAGES.length} reached
        </p>
        <div className="mt-3 flex gap-1">
          {STAGES.map((stage) => (
            <div
              key={stage}
              className={`h-2 flex-1 rounded-full ${
                reached.has(stage) ? STAGE_ACCENT[stage].bar : "bg-outline-variant"
              }`}
            />
          ))}
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-on-surface">
          {result.summary}
        </p>
      </div>

      <div className="rounded-xl bg-surface-card p-4 shadow-soft-card md:p-6">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          Participants
        </h2>

        {result.conclusion.person_of_interest_summary && (
          <>
            <p className="mt-3 mb-2 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              Person of interest
            </p>
            <ParticipantRow
              participant={result.conclusion.person_of_interest_summary}
              highlight
            />
          </>
        )}

        <p className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
          All participants
        </p>
        <div className="flex flex-col gap-2">
          {result.conclusion.participants.map((participant) => (
            <ParticipantRow
              key={participant.speaker}
              participant={participant}
              highlight={false}
            />
          ))}
        </div>
      </div>

      <ol className="flex flex-col gap-4">
        {STAGES.map((stage, index) => {
          const isReached = reached.has(stage);
          const segments = segmentsByStage.get(stage) ?? [];
          const accent = STAGE_ACCENT[stage];

          return (
            <li
              key={stage}
              className="overflow-hidden rounded-xl bg-surface-card shadow-soft-card"
            >
              <div
                className={`flex gap-4 border-l-4 p-4 md:p-6 ${
                  isReached ? accent.icon : "border-outline-variant"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isReached
                      ? `${accent.chip}`
                      : "bg-surface-container text-on-surface-variant/50"
                  }`}
                >
                  {index + 1}
                </span>

                <div className="flex-1">
                  <h3
                    className={`text-sm font-bold ${
                      isReached ? "text-on-surface" : "text-on-surface-variant/50"
                    }`}
                  >
                    {STAGE_LABELS[stage]}
                    {!isReached && (
                      <span className="ml-2 text-xs font-normal">
                        not reached
                      </span>
                    )}
                  </h3>

                  {segments.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-2">
                      {segments.map((segment) => (
                        <li
                          key={segment.message_index}
                          className="rounded-lg bg-background p-3 text-sm"
                        >
                          <div className="flex items-center justify-between text-xs font-medium text-on-surface-variant">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(segment.message_index)}
                              aria-expanded={expandedIndices.has(segment.message_index)}
                              className="text-left font-bold text-primary underline decoration-dotted underline-offset-2"
                            >
                              message #{segment.message_index}{" "}
                              {expandedIndices.has(segment.message_index) ? "▾" : "▸"}
                            </button>
                            <span>
                              confidence {Math.round(segment.confidence * 100)}%
                            </span>
                          </div>
                          <p className="mt-1 text-on-surface">{segment.rationale}</p>
                          {expandedIndices.has(segment.message_index) && (
                            <div
                              className={`mt-2 rounded-lg border-l-4 bg-surface-card p-2 text-xs text-on-surface ${accent.icon}`}
                            >
                              {messagesByIndex.has(segment.message_index) ? (
                                <>
                                  <span className="font-bold">
                                    {messagesByIndex.get(segment.message_index)!.speaker}:
                                  </span>{" "}
                                  {messagesByIndex.get(segment.message_index)!.message}
                                </>
                              ) : (
                                <span className="italic text-on-surface-variant">
                                  Original message unavailable.
                                </span>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div
        className={`relative overflow-hidden rounded-xl p-5 shadow-soft-card md:p-6 ${
          isHighRisk
            ? "bg-error text-on-error"
            : "bg-secondary-container/15 text-on-surface"
        }`}
      >
        <p className="text-sm font-bold uppercase tracking-wide">
          This is not an automated accusation.
        </p>
        {isHighRisk ? (
          <p className="mt-2 text-sm leading-relaxed opacity-95">
            This timeline shows escalation into the isolation/secrecy or
            desensitization stages — human review is strongly recommended.
            Consider a real reporting channel:{" "}
            <span className="font-bold">KPAI</span> or{" "}
            <span className="font-bold">Kominfo Aduan Konten</span>. This tool
            does not determine intent — a person must review the
            conversation.
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            If this timeline raises concern, escalate to a real reporting
            channel: <span className="font-bold text-on-surface">KPAI</span>{" "}
            or{" "}
            <span className="font-bold text-on-surface">
              Kominfo Aduan Konten
            </span>{" "}
            — do not rely on this tool alone.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run the type checker to verify it fails**

Run: `cd frontend && npx tsc --noEmit`
Expected: FAIL — error in `src/app/page.tsx`, `<StageTimeline>` is missing the required `transcript` prop. This confirms `page.tsx` is the only caller and needs updating next.

- [ ] **Step 4: Update `page.tsx` to retain the submitted transcript and pass it down**

Replace the full contents of `frontend/src/app/page.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { TranscriptUploadForm } from "@/components/TranscriptUploadForm";
import { StageTimeline } from "@/components/StageTimeline";
import { analyzeTranscript } from "@/lib/api";
import { AnalysisResult, TranscriptMessage } from "@/lib/types";

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [submittedTranscript, setSubmittedTranscript] = useState<
    TranscriptMessage[] | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(transcript: TranscriptMessage[], poiSpeaker?: string) {
    setIsSubmitting(true);
    setError(null);
    try {
      const analysis = await analyzeTranscript(transcript, poiSpeaker);
      setResult(analysis);
      setSubmittedTranscript(transcript);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 justify-center px-5 pt-24 pb-32 md:px-12 md:pt-4 md:pb-16">
      <main className="flex w-full max-w-[1200px] flex-col gap-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-xl bg-primary p-6 text-on-primary shadow-soft-card md:p-10">
          <div className="relative z-10 max-w-xl">
            <span className="mb-3 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider md:text-xs">
              Stage-by-stage review
            </span>
            <h1 className="text-[26px] font-extrabold leading-tight md:text-[40px]">
              GABRIEL
            </h1>
            <p className="mt-2 text-[14px] leading-snug opacity-90 md:mt-3 md:text-base">
              Paste or upload a chat transcript to get a stage-by-stage
              escalation timeline for human review — not an automated
              verdict.
            </p>
          </div>
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl md:h-64 md:w-64" />
        </section>

        <TranscriptUploadForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />

        {error && (
          <p className="rounded-lg bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
            {error}
          </p>
        )}

        {result && submittedTranscript && (
          <StageTimeline result={result} transcript={submittedTranscript} />
        )}
      </main>
    </div>
  );
}
```

(The hero section itself is unchanged from the prior session — it's already a bold solid-color `bg-primary` card with heavy type, which already matches the warm/bold visual language; no further mockup was made for it, so no further changes are made here beyond the data-flow fix.)

- [ ] **Step 5: Run the type checker to verify it passes**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS — no output, exit code 0.

- [ ] **Step 6: Run lint**

Run: `cd frontend && npm run lint`
Expected: PASS — 0 errors (the pre-existing `@next/next/no-page-custom-font` warning on `layout.tsx` is expected and unrelated to this change).

- [ ] **Step 7: Run the production build**

Run: `cd frontend && npm run build`
Expected: `✓ Compiled successfully`, static pages generated for `/` and `/_not-found`, no errors.

- [ ] **Step 8: Manual browser verification**

Run: `cd frontend && npm run dev`, open `http://localhost:3000`.

1. Paste a transcript (platform = Generic) with at least 2 lines, e.g.:
   ```
   A: hey, how was school
   B: boring lol
   ```
   Submit it (this will use the mock fallback if `NEXT_PUBLIC_BACKEND_URL` is unset — that's fine for this check).
2. Confirm the **Progression** card shows "Stage N of 4 reached" with a 4-segment colored bar, and the summary paragraph still renders below it.
3. Confirm a **Participants** section renders below it, with "Person of interest" (if applicable) and "All participants" showing role + behavior_summary rows.
4. Click a `message #N ▸` reference inside any stage card. Confirm it expands to show `speaker: message text` (or "Original message unavailable." if using the mock fallback with a short pasted transcript where the mock's indices exceed what you typed — this is expected per the Global Constraints' graceful-fallback design, not a bug).
5. Click it again, confirm it collapses back to `▸`.
6. Resize the browser (or use devtools device toolbar) to ~1500px wide, then to ~625px wide. Confirm the progression bar, participants rows, and stage cards all remain legible and don't overflow/clip at either width — same two reference widths used to verify the prior UI-revamp session.
7. Confirm stage-color semantics are unchanged from before this task: `trust_building` still renders green, `risk_assessment` orange, `isolation_secrecy` purple, `desensitization` red, in both the new progress bar and the existing per-stage chips/borders — only the surrounding card backgrounds/layout changed, not the stage color mapping.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/globals.css frontend/src/app/page.tsx frontend/src/components/StageTimeline.tsx
git commit -m "Redesign results screen: progression header, participants/roles section, message preview"
```

---

### Task 3: Restyle `TranscriptUploadForm.tsx`

**Files:**
- Modify: `frontend/src/components/TranscriptUploadForm.tsx`
- Test: none. Verified via `npx tsc --noEmit`, `npm run lint`, manual browser check.

**Interfaces:**
- Consumes: `--color-progression-bg`, `--color-poi-bg` tokens from Task 2's `globals.css` change.
- Produces: nothing new — no prop/type changes, purely `className` edits. `TranscriptUploadFormProps`, all state, and all handler logic are untouched.

- [ ] **Step 1: Tint the platform-select card**

In `frontend/src/components/TranscriptUploadForm.tsx`, find this block (currently the first card in the main column):

```tsx
          <div className="rounded-xl bg-surface-card p-4 shadow-soft-card md:p-6">
            <label
              htmlFor="platform"
              className="mb-2 ml-1 block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant"
            >
              Source platform
            </label>
```

Change `bg-surface-card` to `bg-progression-bg` on that line only:

```tsx
          <div className="rounded-xl bg-progression-bg p-4 shadow-soft-card md:p-6">
            <label
              htmlFor="platform"
              className="mb-2 ml-1 block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant"
            >
              Source platform
            </label>
```

- [ ] **Step 2: Tint the person-of-interest card**

Find this block:

```tsx
          {speakers.length > 0 && (
            <div className="rounded-xl bg-surface-card p-4 shadow-soft-card md:p-6">
              <label
                htmlFor="poi"
```

Change `bg-surface-card` to `bg-poi-bg` on that line only:

```tsx
          {speakers.length > 0 && (
            <div className="rounded-xl bg-poi-bg p-4 shadow-soft-card md:p-6">
              <label
                htmlFor="poi"
```

- [ ] **Step 3: Make the file-upload dropzone icon a solid filled chip (matching the participant-avatar chip language from Task 2)**

Find this block:

```tsx
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-transform group-hover:scale-105">
                <span className="material-symbols-outlined text-[28px] text-primary">
                  cloud_upload
                </span>
              </div>
```

Replace with:

```tsx
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container transition-transform group-hover:scale-105">
                <span className="material-symbols-outlined text-[28px] text-on-secondary">
                  cloud_upload
                </span>
              </div>
```

- [ ] **Step 4: Run the type checker**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS (this task makes no type changes, only `className` string edits — this step exists to catch a typo in a class name being mistyped as a prop, which it isn't here).

- [ ] **Step 5: Run lint**

Run: `cd frontend && npm run lint`
Expected: PASS.

- [ ] **Step 6: Manual browser verification**

Run: `cd frontend && npm run dev`, open `http://localhost:3000`.
Confirm: the "Source platform" card has a peach tint, the file-upload dropzone icon is a solid orange filled circle, and — after pasting/typing a transcript with 2+ distinct speakers — the "Who is the person being protected?" card has a light-green tint. Confirm the form still submits correctly (paste text, select platform, submit, still reaches the results screen from Task 2).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/TranscriptUploadForm.tsx
git commit -m "Restyle upload form cards to match the warm palette"
```

---

### Task 4: Restyle desktop nav active state in `Header.tsx`

**Files:**
- Modify: `frontend/src/components/Header.tsx`
- Test: none. Verified via `npx tsc --noEmit`, `npm run lint`, manual browser check.

**Interfaces:**
- Consumes: existing `--color-primary-container`, `--color-on-primary-container` tokens (no new tokens needed).
- Produces: nothing new — purely a `className` edit on the existing active `<Link>`. Nav items, routes, and the disabled-placeholder behavior for History/Settings are untouched.

- [ ] **Step 1: Replace the underline-style active nav link with a filled pill chip**

In `frontend/src/components/Header.tsx`, find this block (inside the desktop `<header>`'s nav items map, the `item.active` branch):

```tsx
                item.active ? (
                  <Link
                    key={item.label}
                    href="/"
                    className="border-b-4 border-primary pb-1 text-sm font-semibold text-primary"
                  >
                    {item.label}
                  </Link>
                ) : (
```

Replace with:

```tsx
                item.active ? (
                  <Link
                    key={item.label}
                    href="/"
                    className="rounded-full bg-primary-container px-4 py-2 text-sm font-bold text-on-primary-container"
                  >
                    {item.label}
                  </Link>
                ) : (
```

- [ ] **Step 2: Run the type checker**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Run lint**

Run: `cd frontend && npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual browser verification**

Run: `cd frontend && npm run dev`, open `http://localhost:3000` at a desktop width (≥768px, e.g. resize the browser or use devtools). Confirm the "Analysis" nav item now renders as a filled light-blue rounded pill instead of a thin underline, and "History"/"Settings" remain visibly disabled (dimmed, `title="Coming soon"` on hover). Resize below 768px and confirm the mobile top bar (unchanged) still renders correctly — `BottomNav.tsx` is not touched by this task, so mobile nav should look identical to before.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Header.tsx
git commit -m "Restyle desktop nav active state from underline to filled pill"
```

**Note on `BottomNav.tsx` (listed in the spec's component table, deliberately not changed here):** its active item already uses a filled `bg-primary-container` circular chip around the icon plus a bold colored label — the same "avatar chip" language this task is retrofitting onto `Header.tsx`'s desktop nav. It doesn't have the underline-nav pattern that motivated this task, so there's no equivalent generic-SaaS element to fix. Re-verify this assumption during Step 4's manual check (mobile width); if the bottom nav looks inconsistent with the rest of the redesign at that point, that's a new finding, not something this plan already accounted for.

---

## Post-plan note

`HANDOFF.md` should get a new entry after these four tasks land, following the repo's append-only convention (see the top of that file for the exact format) — summarizing: conclusion now rendered, message-preview added, visual system updated app-wide, superseding the "still open: conclusion object still unparsed" line from the 2026-07-17 entry. This isn't a plan task because it's a documentation step outside the four file-change tasks above, not a testable deliverable — do it once all four tasks are committed.
