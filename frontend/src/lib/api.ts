import {
  AnalysisResult,
  AuthResponse,
  TranscriptCreatedResponse,
  TranscriptDetailResponse,
  TranscriptMessage,
} from "./types";
import { MOCK_ANALYSIS_RESULT } from "./mock";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const TOKEN_STORAGE_KEY = "gabriel_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

/** Registers a new user - the response already includes a ready-to-use token (auto-login). */
export async function registerUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BACKEND_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, "Registration failed."));
  }
  return res.json();
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, "Login failed."));
  }
  return res.json();
}

/**
 * Uploads a transcript, then runs analysis on it. Falls back to a labeled
 * mock fixture when NEXT_PUBLIC_BACKEND_URL isn't set, so the UI can be
 * built/demoed before the backend and ai-service are wired up.
 *
 * Matches the real backend contract (docs/api-contract.md, sections 1-3):
 * POST /transcripts takes a bare array (not `{transcript}`) and only stores
 * the transcript; a separate POST /transcripts/{id}/analyze runs analysis.
 * Both now require the Authorization header (section 0).
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
    headers: { "Content-Type": "application/json", ...authHeaders() },
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
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(poiSpeaker ? { person_of_interest: poiSpeaker } : {}),
  });

  if (!res.ok) {
    throw new Error(`Analysis request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Chat history list - every transcript the current user has uploaded, newest
 * first, each with its latest analysis embedded if one exists (section 2).
 * No mock fallback - a meaningful history needs real, varied backend state.
 */
export async function getHistory(): Promise<TranscriptDetailResponse[]> {
  const res = await fetch(`${BACKEND_URL}/transcripts`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    throw new Error(`Failed to load history: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/** Chat history detail - a single transcript + its latest analysis (section 4). */
export async function getHistoryDetail(id: string): Promise<TranscriptDetailResponse> {
  const res = await fetch(`${BACKEND_URL}/transcripts/${id}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    throw new Error(`Failed to load transcript: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
