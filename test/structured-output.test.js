import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAnalysis,
  runStructuredAnalysis
} from "../src/structured-output.js";

const validAnalysis = {
  documentType: "invoice",
  summary: "An overdue invoice.",
  riskLevel: "high",
  keyFacts: ["Payment is overdue"]
};

test("extracts and validates JSON from a fenced model response", () => {
  const result = parseAnalysis(`Here is the result:\n\`\`\`json
${JSON.stringify(validAnalysis)}
\`\`\``);

  assert.deepEqual(result, validAnalysis);
});

test("retries after invalid JSON", async () => {
  const responses = [
    {
      choices: [{ message: { content: "not json" } }],
      usage: { prompt_tokens: 20, completion_tokens: 2, total_tokens: 22 }
    },
    {
      choices: [{ message: { content: JSON.stringify(validAnalysis) } }],
      usage: { prompt_tokens: 30, completion_tokens: 8, total_tokens: 38 }
    }
  ];
  const client = { chat: async () => responses.shift() };
  const result = await runStructuredAnalysis({
    client,
    request: {
      messages: [{ role: "user", content: "Analyze this" }]
    }
  });

  assert.equal(result.attempts, 2);
  assert.deepEqual(result.data, validAnalysis);
  assert.deepEqual(result.usage, {
    prompt_tokens: 50,
    completion_tokens: 10,
    total_tokens: 60
  });
});

test("returns a safe fallback after three invalid responses", async () => {
  const client = {
    chat: async () => ({ choices: [{ message: { content: "invalid" } }] })
  };
  const result = await runStructuredAnalysis({
    client,
    request: { messages: [{ role: "user", content: "Analyze this" }] }
  });

  assert.equal(result.fallback, true);
  assert.equal(result.data.documentType, "unknown");
});
