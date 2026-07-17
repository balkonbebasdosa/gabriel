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

export interface AnalysisResult {
  id?: string;
  transcript_id?: string;
  created_at?: string;
  segments: AnalysisSegment[];
  progression_score: number;
  stages_reached: Stage[];
  summary: string;
}

export interface TranscriptCreatedResponse {
  id: string;
  created_at: string;
  message_count: number;
}
