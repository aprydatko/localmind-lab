import { z } from "zod";
import { runWithRetry } from "./utils/llm-retry.js";

export const analysisSchema = z.object({
  documentType: z.string().min(1),
  summary: z.string().min(1),
  riskLevel: z.enum(["low", "medium", "high"]),
  keyFacts: z.array(z.string()).max(10)
});

const extractJson = (text) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1) throw new Error("No JSON object found");
  return JSON.parse(candidate.slice(start, end + 1));
};

export const parseAnalysis = (text) => analysisSchema.parse(extractJson(text));

export const structuredSystemPrompt = `You analyze documents and return JSON only.
The response must match this schema:
{
  "documentType": "non-empty string",
  "summary": "non-empty string",
  "riskLevel": "low | medium | high",
  "keyFacts": ["up to 10 strings"]
}
Do not use markdown or add fields.`;

export const runStructuredAnalysis = async ({ client, request, attempts = 3 }) => {
  const result = await runWithRetry({
    client,
    request,
    parser: parseAnalysis,
    systemPrompt: structuredSystemPrompt,
    attempts,
    getCorrectionPrompt: (error) => `Your response failed JSON validation: ${error.message}. Return corrected JSON only.`
  });

  if (result.fallback) {
    return {
      ...result,
      data: {
        documentType: "unknown",
        summary: "The model did not return valid structured data.",
        riskLevel: "high",
        keyFacts: []
      }
    };
  }

  return result;
};
