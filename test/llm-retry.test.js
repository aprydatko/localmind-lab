import assert from "node:assert/strict";
import test, { describe, beforeEach } from "node:test";
import { runWithRetry } from "../src/utils/llm-retry.js";

describe("runWithRetry", () => {
  const buildMock = (responses) => {
    const queue = [...responses];
    const calls = [];
    return {
      client: {
        chat: async (request) => {
          calls.push(request);
          const next = queue.shift();
          return typeof next === "function" ? next(request, calls) : next;
        },
      },
      calls,
    };
  };

  const jsonParser = (text) => {
    const parsed = JSON.parse(text);
    if (!parsed.valid) {
      throw new Error("Invalid data");
    }
    return parsed;
  };

  beforeEach(() => {
    jsonParser;
  });

  test("returns data on first successful attempt", async () => {
    const { client } = buildMock([
      {
        choices: [{ message: { content: '{"valid": true, "value": 42}' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      },
    ]);

    const result = await runWithRetry({
      client,
      request: { messages: [{ role: "user", content: "Hi" }] },
      parser: jsonParser,
      systemPrompt: "Be helpful",
      attempts: 3,
    });

    assert.equal(result.data.value, 42);
    assert.equal(result.attempts, 1);
    assert.equal(result.fallback, undefined);
  });

  test("retries on parse failure and reports attempt count", async () => {
    const { client } = buildMock([
      {
        choices: [{ message: { content: "broken" } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      },
      {
        choices: [{ message: { content: '{"valid": true}' } }],
        usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 },
      },
    ]);

    const result = await runWithRetry({
      client,
      request: { messages: [{ role: "user", content: "Hi" }] },
      parser: jsonParser,
      attempts: 3,
    });

    assert.equal(result.attempts, 2);
    assert.deepEqual(result.data, { valid: true });
  });

  test("returns fallback true after exhausting all attempts", async () => {
    const { client } = buildMock([
      {
        choices: [{ message: { content: "invalid" } }],
        usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
      },
      {
        choices: [{ message: { content: "still invalid" } }],
        usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
      },
      {
        choices: [{ message: { content: "nope" } }],
        usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
      },
    ]);

    const result = await runWithRetry({
      client,
      request: { messages: [{ role: "user", content: "Hi" }] },
      parser: jsonParser,
      attempts: 3,
    });

    assert.equal(result.fallback, true);
    assert.equal(result.attempts, 3);
  });

  test("aggregates token usage across retries", async () => {
    const { client } = buildMock([
      {
        choices: [{ message: { content: "bad" } }],
        usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
      },
      {
        choices: [{ message: { content: '{"valid": true}' } }],
        usage: { prompt_tokens: 20, completion_tokens: 4, total_tokens: 24 },
      },
    ]);

    const result = await runWithRetry({
      client,
      request: { messages: [{ role: "user", content: "Hi" }] },
      parser: jsonParser,
      attempts: 3,
    });

    assert.deepEqual(result.usage, {
      prompt_tokens: 30,
      completion_tokens: 6,
      total_tokens: 36,
    });
  });

  test("includes validation error message in fallback result", async () => {
    const { client } = buildMock([
      {
        choices: [{ message: { content: "not json at all" } }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      },
    ]);

    const result = await runWithRetry({
      client,
      request: { messages: [{ role: "user", content: "Hi" }] },
      parser: jsonParser,
      attempts: 1,
    });

    assert.match(result.validationError, /Unexpected token/);
  });

  test("prepends system prompt and filters existing system messages", async () => {
    const { client, calls } = buildMock([
      {
        choices: [{ message: { content: '{"valid": true}' } }],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
      },
    ]);

    await runWithRetry({
      client,
      request: {
        messages: [
          { role: "system", content: "Ignore this" },
          { role: "user", content: "Hi" },
        ],
      },
      parser: jsonParser,
      systemPrompt: "Correct system prompt",
      attempts: 1,
    });

    const sentMessages = calls[0].messages;
    assert.deepEqual(sentMessages[0], { role: "system", content: "Correct system prompt" });
    assert.equal(sentMessages[1].role, "user");
    assert.equal(sentMessages.length, 2);
  });

  test("does not add system prompt when systemPrompt is empty/null", async () => {
    const { client, calls } = buildMock([
      {
        choices: [{ message: { content: '{"valid": true}' } }],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
      },
    ]);

    await runWithRetry({
      client,
      request: { messages: [{ role: "user", content: "Hi" }] },
      parser: jsonParser,
      attempts: 1,
    });

    const sentMessages = calls[0].messages;
    assert.equal(sentMessages.length, 1);
    assert.equal(sentMessages[0].role, "user");
  });

  test("appends assistant response and correction prompt on retry", async () => {
    const { client, calls } = buildMock([
      {
        choices: [{ message: { content: "bad output" } }],
        usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
      },
      {
        choices: [{ message: { content: '{"valid": true}' } }],
        usage: { prompt_tokens: 20, completion_tokens: 4, total_tokens: 24 },
      },
    ]);

    const customCorrection = (error) => `Fix this: ${error.message}`;
    await runWithRetry({
      client,
      request: { messages: [{ role: "user", content: "Hi" }] },
      parser: jsonParser,
      attempts: 2,
      getCorrectionPrompt: customCorrection,
    });

    const secondCallMessages = calls[1].messages;
    assert.equal(secondCallMessages.length, 3);
    assert.equal(secondCallMessages[1].role, "assistant");
    assert.equal(secondCallMessages[1].content, "bad output");
    assert.equal(secondCallMessages[2].role, "user");
    assert.match(secondCallMessages[2].content, /Fix this/);
  });

  test("handles empty response content gracefully", async () => {
    const { client } = buildMock([
      {
        choices: [{ message: { content: "" } }],
        usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
      },
      {
        choices: [{ message: { content: '{"valid": true}' } }],
        usage: { prompt_tokens: 15, completion_tokens: 3, total_tokens: 18 },
      },
    ]);

    const result = await runWithRetry({
      client,
      request: { messages: [{ role: "user", content: "Hi" }] },
      parser: jsonParser,
      attempts: 2,
    });

    assert.equal(result.attempts, 2);
    assert.deepEqual(result.data, { valid: true });
  });
});
