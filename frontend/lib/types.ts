export interface Recommendation {
  name: string;
  url: string;
  test_type: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  recommendations?: Recommendation[];
  end_of_conversation?: boolean;
}

export interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
}

export interface ChatResponse {
  reply: string;
  recommendations: Recommendation[];
  end_of_conversation: boolean;
}

// Test type code to label mapping
export const TEST_TYPE_LABELS: Record<string, string> = {
  A: "Ability & Aptitude",
  B: "Situational Judgment",
  C: "Competencies",
  D: "Development & 360",
  E: "Assessment Exercises",
  K: "Knowledge & Skills",
  P: "Personality & Behavior",
  S: "Simulations",
};

// Test type code to color mapping (for badges)
export const TEST_TYPE_COLORS: Record<string, string> = {
  A: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  B: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  C: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  D: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  E: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  K: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  P: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  S: "bg-teal-500/20 text-teal-300 border-teal-500/30",
};
