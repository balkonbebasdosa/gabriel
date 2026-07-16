import { AnalysisResult, TranscriptCreatedResponse, TranscriptMessage } from "./types";
import { MOCK_ANALYSIS_RESULT } from "./mock";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

/**
 * Uploads a transcript, then runs analysis on it. Falls back to a labeled
 * mock fixture when NEXT_PUBLIC_BACKEND_URL isn't set, so the UI can be
 * built/demoed before the backend and ai-service are wired up.
 *
 * Matches the real backend contract (docs/api-contract.md, sections 1-2):
 * POST /transcripts takes a bare array (not `{transcript}`) and only stores
 * the transcript; a separate POST /transcripts/{id}/analyze runs analysis.
 *
 * poiSpeaker (person of interest, e.g. the child being protected) is not
 * yet part of the finalized contract — adit/gabriel still need to confirm
 * the field name and wire the AI service to consume it. Sent as an optional
 * body on /analyze (which today takes no body at all) so this is purely
 * additive and can't break the existing handler. See HANDOFF.md.
 */
export async function analyzeTranscript(
  transcript: TranscriptMessage[],
  poiSpeaker?: string
): Promise<AnalysisResult> {
  if (!BACKEND_URL) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return MOCK_ANALYSIS_RESULT;
  }

  const created = await createTranscript(transcript);
  return runAnalysis(created.id, poiSpeaker);
}

async function createTranscript(
  transcript: TranscriptMessage[]
): Promise<TranscriptCreatedResponse> {
  const res = await fetch(`${BACKEND_URL}/transcripts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transcript),
  });

  if (!res.ok) {
    throw new Error(`Transcript upload failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

async function runAnalysis(
  transcriptId: string,
  poiSpeaker?: string
): Promise<AnalysisResult> {
  const res = await fetch(`${BACKEND_URL}/transcripts/${transcriptId}/analyze`, {
    method: "POST",
    ...(poiSpeaker
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ poi_speaker: poiSpeaker }),
        }
      : {}),
  });

  if (!res.ok) {
    throw new Error(`Analysis request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
