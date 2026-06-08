import { z } from "zod";

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
  let messages = [
    { role: "system", content: structuredSystemPrompt },
    ...request.messages.filter((message) => message.role !== "system")
  ];
  let lastError;
  let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await client.chat({ ...request, messages, stream: false });
    const content = result.choices?.[0]?.message?.content || "";
    usage = {
      prompt_tokens: usage.prompt_tokens + (result.usage?.prompt_tokens || 0),
      completion_tokens: usage.completion_tokens + (result.usage?.completion_tokens || 0),
      total_tokens: usage.total_tokens + (result.usage?.total_tokens || 0)
    };

    try {
      return { data: parseAnalysis(content), attempts: attempt, usage };
    } catch (error) {
      lastError = error;
      messages = [
        ...messages,
        { role: "assistant", content },
        {
          role: "user",
          content: `Your response failed JSON validation: ${error.message}. Return corrected JSON only.`
        }
      ];
    }
  }

  return {
    data: {
      documentType: "unknown",
      summary: "The model did not return valid structured data.",
      riskLevel: "high",
      keyFacts: []
    },
    attempts,
    fallback: true,
    validationError: lastError?.message,
    usage
  };
};
