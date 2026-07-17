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
 * poiSpeaker (person of interest, e.g. the child being protected) is sent
 * as `person_of_interest` on /analyze, matching adit/gabriel's finalized
 * contract (docs/api-contract.md section 2/6, confirmed 2026-07-17).
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
          body: JSON.stringify({ person_of_interest: poiSpeaker }),
        }
      : {}),
  });

  if (!res.ok) {
    throw new Error(`Analysis request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
