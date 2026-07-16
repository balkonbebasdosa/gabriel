import { AnalysisResult, TranscriptMessage } from "./types";
import { MOCK_ANALYSIS_RESULT } from "./mock";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

/**
 * Sends a transcript to the backend for analysis. Falls back to a labeled
 * mock fixture when NEXT_PUBLIC_BACKEND_URL isn't set, so the UI can be
 * built/demoed before the backend and ai-service are wired up.
 */
export async function analyzeTranscript(
  transcript: TranscriptMessage[]
): Promise<AnalysisResult> {
  if (!BACKEND_URL) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return MOCK_ANALYSIS_RESULT;
  }

  const res = await fetch(`${BACKEND_URL}/transcripts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });

  if (!res.ok) {
    throw new Error(`Analysis request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
