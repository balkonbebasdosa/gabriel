# Results screen redesign: visual system + message preview + participant roles

**Status:** approved, pending implementation plan
**Branch:** `feat/frontend-gunta`
**Related:** `docs/api-contract.md` (sections 2/3/6), `HANDOFF.md`'s 2026-07-17 UI-revamp entry (this spec supersedes that visual system, not the underlying components/logic)

## Problem

The current design system (shipped last session) reads as a generic "AI SaaS dashboard" — Material-3-style flat cards, uniform white surfaces, thin left-border accents. It doesn't match the tone the team wants, and it's missing two pieces of data the backend already provides:

1. **`conclusion.participants[]`** (role + behavior_summary per speaker, plus `person_of_interest_summary`) exists in every `/analyze` response today and is completely unrendered — `types.ts`'s `AnalysisResult` doesn't even have the field.
2. **Message references** (`message #14` in each stage segment) are static text — there's no way to see what that message actually said without going back to the original transcript, which the UI doesn't even keep after submit.

## Goals

- Replace the visual system app-wide (nav, hero, upload form, results screen) with a warmer, more illustrated, less "generic AI tool" look, inspired by the reference mockups provided (playful edtech-app aesthetic: color-blocked pastel cards, avatar chips, bold rounded type, chunky stat numbers).
- Render `conclusion` data: every participant's role + behavior_summary, with the selected person_of_interest pinned/prominent above the full list.
- Make every `message #N` reference clickable — inline-expands to show that message's actual speaker + text, directly under the segment it's cited in.

## Non-goals

- No new routes/pages — History/Settings stay disabled placeholders (per the prior session's explicit scope decision).
- No backend or `docs/api-contract.md` changes — `conclusion` is already fully implemented server-side (confirmed live via the `feat/ai-gabriel`/`feat/backend-adit` merge and a real end-to-end Groq-backed test run); this is pure frontend consumption.
- No new fonts/icon libraries — reusing Plus Jakarta Sans and Material Symbols, just applied differently.
- Not touching: Telegram-parser verification, `docker-compose` Dockerfile gaps, or any other pre-existing "still open" item unrelated to this redesign.

## Visual system

- **Palette**: keep the warm off-white base (`--color-background: #fdf7f0`). Replace the current *uniform* white `surface-card` treatment with **color-blocked pastel section backgrounds** — e.g. cream/peach (`#FDEEDC`) for the progression summary card, white cards with tinted inset rows (`#EAF6E3` green-tinted for POI, `#FDEEDC` peach-tinted for other participants) for the participants section.
- **Stage colors stay semantic, not decorative.** The four LCT stages keep a fixed green → orange → purple → red progression (trust_building → risk_assessment → isolation_secrecy → desensitization), matching today's `STAGE_ACCENT` mapping in intent. This is a deliberate constraint: the reference's pastel palette is aesthetic-only, but GABRIEL's stage colors carry meaning (escalating risk) and must stay consistent and predictable across every render — they are not restyled per section like the reference's arbitrary card colors.
- **Typography**: no new font. Plus Jakarta Sans at heavier weight (800) for headline/stat numbers, same as already loaded. Courier Prime stays for the transcript textarea only.
- **Iconography**: Material Symbols Outlined (already loaded via `layout.tsx`'s `<head>` link), placed inside solid-colored circular chips consistently (avatar-style), replacing today's plain icon-in-button treatment.
- **Radii/shadows**: keep existing `--radius-lg`/`--radius-xl` and `--shadow-soft-card` tokens — the change is section background color-blocking and bolder internal layout, not the corner/shadow language itself.

## Component changes

| File | Change |
|---|---|
| `frontend/src/app/globals.css` | Add pastel section-background tokens (e.g. `--color-progression-bg`, `--color-poi-bg`) alongside existing tokens. No removal of existing `--color-*` tokens used elsewhere. |
| `frontend/src/components/StageTimeline.tsx` | Largest change. Adds: (a) a "Participants" card rendering `conclusion.participants[]`, POI entry pinned above an "all participants" list; (b) click-to-expand on each segment's `message #N` reference. Restyles progression summary and per-stage cards to the bolder/color-blocked look. `STAGE_ACCENT` mapping logic is preserved, only its visual application changes. |
| `frontend/src/components/Header.tsx`, `BottomNav.tsx` | Restyle only — same nav items, same routes, same disabled-placeholder behavior for History/Settings. |
| `frontend/src/app/page.tsx` | Restyle hero section; **behavioral change** — must now retain the submitted `transcript` in state (currently discarded after `handleSubmit`) and pass it down to `StageTimeline` for message-preview lookups. |
| `frontend/src/components/TranscriptUploadForm.tsx` | Restyle only — all state/handlers/parsing logic untouched. |

## Data model changes

- `frontend/src/lib/types.ts`: add `conclusion` to `AnalysisResult`, matching `docs/api-contract.md` section 2/3 exactly:
  ```ts
  interface Participant {
    speaker: string;
    role: "target_victim" | "active_participant" | "bystander" | "mediator" | "unclear";
    behavior_summary: string;
  }
  interface Conclusion {
    participants: Participant[];
    person_of_interest_summary: Participant | null;
  }
  // AnalysisResult gains: conclusion: Conclusion;
  ```
- `frontend/src/lib/mock.ts`: extend `MOCK_ANALYSIS_RESULT` with a `conclusion` object so the no-backend demo path also exercises the new UI (currently falls back silently when `NEXT_PUBLIC_BACKEND_URL` is unset).

## New interaction: message preview

- Trigger: click/tap on `message #{n}` text within a segment card.
- Behavior: toggles an inline block directly beneath that segment, showing `speaker: message text` for `transcript[n]`, styled as a small quoted card (left accent bar matching the stage color). Second click collapses it.
- Lookup: `StageTimeline` builds a `Map<number, TranscriptMessage>` from the `transcript` prop once (via `useMemo`), keyed by array index — no per-click computation, no network call.
- No portal/modal/overlay — avoids z-index and mobile-viewport-sizing complexity entirely, and behaves identically at every breakpoint.

## Participants / roles section

- Renders below the progression summary card, above the stage timeline list.
- If `person_of_interest_summary` is non-null: rendered first, visually distinguished (green-tinted row, per mockup) with a label ("Person of interest").
- All entries in `participants[]` (including the POI's own entry, not duplicated) render below under an "All participants" label.
- Role values render as-is (`target_victim`, `active_participant`, `bystander`, `mediator`, `unclear`) — no relabeling, no additional interpretation layer, consistent with the project's non-negotiable "descriptive, not an accusation" framing already applied to `stage`.

## Error handling / edge cases

- `conclusion` is always present in real responses (backend guarantees this per `docs/api-contract.md`), but the mock fixture must be updated in lockstep (see Data model changes) so `StageTimeline` never has to special-case a missing `conclusion`.
- `person_of_interest_summary` is `null` when no POI was selected — the "Person of interest" pinned row simply doesn't render in that case; "All participants" still does.
- Message-preview lookups use the array index directly (`message_index` is documented as zero-based into the request's `transcript` array) — no fuzzy matching, no fallback needed since backend and frontend already agree on this indexing.

## Testing plan

- `tsc --noEmit` and `npm run lint` clean (matches existing CI gate).
- Manual verification in-browser at both desktop (~1500px) and mobile (~625px) widths, same as the prior UI-revamp session's verification approach:
  - Submit a transcript, confirm the participants section renders both the pinned POI and the full list.
  - Click a `message #N` reference, confirm the correct message text expands inline; click again, confirm it collapses.
  - Confirm the no-backend mock path (`NEXT_PUBLIC_BACKEND_URL` unset) also renders the new sections without errors, using the updated mock fixture.
  - Confirm stage-color semantics are unchanged (green→red still maps to the same four stages) despite the new pastel card backgrounds.

## Open questions for implementation

None — all decisions above were confirmed during brainstorming (visual direction, message-preview pattern, and participant-display scope were each explicitly chosen).
