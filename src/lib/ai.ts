import { anthropic } from "@ai-sdk/anthropic";

export const chatModel = anthropic("claude-sonnet-4-6");

// Lightweight model for the parallel crisis-risk classifier (see src/lib/safety/classifier.ts).
export const classifierModel = anthropic("claude-haiku-4-5");
