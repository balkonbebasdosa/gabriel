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
};
