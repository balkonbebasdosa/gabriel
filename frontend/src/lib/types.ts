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

/**
 * Shared stage color/style tokens - lives in a plain (non "use client")
 * module so both server components (e.g. the home page) and client
 * components (StageTimeline) can import it safely.
 */
export const STAGE_ACCENT: Record<Stage, { bar: string; chip: string; icon: string }> = {
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

export interface TranscriptDetailResponse {
  id: string;
  created_at: string;
  messages: TranscriptMessage[];
  latest_analysis: AnalysisResult | null;
}

export interface AuthResponse {
  user_id: string;
  email: string;
  token: string;
}
