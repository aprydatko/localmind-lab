import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
  parseAnalysis,
  runStructuredAnalysis,
  analysisSchema,
} from "../src/structured-output.js";

describe("structured-output", () => {
  const validAnalysis = {
    documentType: "invoice",
    summary: "An overdue invoice.",
    riskLevel: "high",
    keyFacts: ["Payment is overdue"],
  };

  describe("parseAnalysis", () => {
    test("extracts and validates JSON from a fenced model response", () => {
      const result = parseAnalysis(`Here is the result:\n\`\`\`json\n${JSON.stringify(validAnalysis)}\n\`\`\``);
      assert.deepEqual(result, validAnalysis);
    });

    test("extracts JSON from a plain-text response without fences", () => {
      const text = `Analysis result: ${JSON.stringify(validAnalysis)} end of analysis.`;
      const result = parseAnalysis(text);
      assert.deepEqual(result, validAnalysis);
    });

    test("parses the inner JSON from a code fence without language tag", () => {
      const result = parseAnalysis(`\`\`\`\n${JSON.stringify(validAnalysis)}\n\`\`\``);
      assert.deepEqual(result, validAnalysis);
    });

    test("throws when the JSON object is missing keyFacts", () => {
      const partial = { documentType: "contract", summary: "Valid summary.", riskLevel: "low" };
      assert.throws(() => parseAnalysis(JSON.stringify(partial)), /keyFacts/);
    });

    test("throws when riskLevel is not a valid enum value", () => {
      const invalid = { ...validAnalysis, riskLevel: "extreme" };
      assert.throws(() => parseAnalysis(JSON.stringify(invalid)), /riskLevel/);
    });

    test("throws when documentType is empty string", () => {
      const invalid = { ...validAnalysis, documentType: "" };
      assert.throws(() => parseAnalysis(JSON.stringify(invalid)), /documentType/);
    });

    test("throws when keyFacts exceeds 10 items", () => {
      const invalid = { ...validAnalysis, keyFacts: Array.from({ length: 11 }, (_, i) => `fact ${i}`) };
      assert.throws(() => parseAnalysis(JSON.stringify(invalid)), /keyFacts/);
    });

    test("throws when no JSON object is found in the response", () => {
      assert.throws(
        () => parseAnalysis("There is no JSON object here at all."),
        /No JSON object found/
      );
    });
  });

  describe("runStructuredAnalysis", () => {
    test("retries after invalid JSON", async () => {
      const responses = [
        {
          choices: [{ message: { content: "not json" } }],
          usage: { prompt_tokens: 20, completion_tokens: 2, total_tokens: 22 },
        },
        {
          choices: [{ message: { content: JSON.stringify(validAnalysis) } }],
          usage: { prompt_tokens: 30, completion_tokens: 8, total_tokens: 38 },
        },
      ];
      const client = { chat: async () => responses.shift() };
      const result = await runStructuredAnalysis({
        client,
        request: { messages: [{ role: "user", content: "Analyze this" }] },
      });

      assert.equal(result.attempts, 2);
      assert.deepEqual(result.data, validAnalysis);
      assert.deepEqual(result.usage, {
        prompt_tokens: 50,
        completion_tokens: 10,
        total_tokens: 60,
      });
    });

    test("returns a safe fallback after three invalid responses", async () => {
      const client = {
        chat: async () => ({
          choices: [{ message: { content: "invalid" } }],
        }),
      };
      const result = await runStructuredAnalysis({
        client,
        request: { messages: [{ role: "user", content: "Analyze this" }] },
      });

      assert.equal(result.fallback, true);
      assert.equal(result.data.documentType, "unknown");
    });

    test("succeeds on first attempt when response is valid async", async () => {
      const client = {
        chat: async () => ({
          choices: [{ message: { content: JSON.stringify(validAnalysis) } }],
          usage: { prompt_tokens: 50, completion_tokens: 15, total_tokens: 65 },
        }),
      };
      const result = await runStructuredAnalysis({
        client,
        request: { messages: [{ role: "user", content: "Analyze this" }] },
      });

      assert.equal(result.attempts, 1);
      assert.deepEqual(result.data, validAnalysis);
      assert.equal(result.fallback, undefined);
    });
  });
});
