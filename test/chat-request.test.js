import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { buildChatRequest } from "../src/chat-request.js";

describe("buildChatRequest", () => {
  describe("builds an OpenAI-compatible chat request", () => {
    test("trims whitespace from message content", () => {
      const result = buildChatRequest(
        { messages: [{ role: "user", content: " Hello " }], temperature: 0, max_tokens: 128 },
        "demo"
      );
      assert.deepEqual(result, {
        model: "demo",
        messages: [{ role: "user", content: "Hello" }],
        temperature: 0,
        max_tokens: 128,
        stream: false,
      });
    });

    test("uses default temperature 0.7 and max_tokens 512", () => {
      const result = buildChatRequest({
        messages: [{ role: "user", content: "Hi" }],
      });
      assert.equal(result.temperature, 0.7);
      assert.equal(result.max_tokens, 512);
    });

    test("uses input.model over fallbackModel", () => {
      const result = buildChatRequest(
        { model: "primary", messages: [{ role: "user", content: "Hi" }] },
        "fallback"
      );
      assert.equal(result.model, "primary");
    });

    test("uses fallbackModel when input.model is missing", () => {
      const result = buildChatRequest(
        { messages: [{ role: "user", content: "Hi" }] },
        "fallback"
      );
      assert.equal(result.model, "fallback");
    });

    test("defaults model to 'local-model' when both are missing", () => {
      const result = buildChatRequest({ messages: [{ role: "user", content: "Hi" }] });
      assert.equal(result.model, "local-model");
    });

    test("enables streaming when requested", () => {
      const result = buildChatRequest(
        { messages: [{ role: "user", content: "Hi" }] },
        "",
        { stream: true }
      );
      assert.equal(result.stream, true);
    });

    test("includes tools and tool_choice when provided", () => {
      const tools = [{ type: "function", function: { name: "search" } }];
      const result = buildChatRequest(
        { messages: [{ role: "user", content: "Hi" }] },
        "",
        { tools }
      );
      assert.deepEqual(result.tools, tools);
      assert.equal(result.tool_choice, "auto");
    });

    test("does not include tools when options.tools is empty array", () => {
      const result = buildChatRequest(
        { messages: [{ role: "user", content: "Hi" }] },
        "",
        { tools: [] }
      );
      assert.equal(result.tools, undefined);
    });
  });

  describe("validation", () => {
    test("rejects non-array messages", () => {
      assert.throws(
        () => buildChatRequest({ messages: "not an array" }),
        /non-empty array/
      );
    });

    test("rejects empty messages array", () => {
      assert.throws(
        () => buildChatRequest({ messages: [] }),
        /non-empty array/
      );
    });

    test("rejects messages missing content", () => {
      assert.throws(
        () => buildChatRequest({ messages: [{ role: "user" }] }),
        /content is required/
      );
    });

    test("rejects messages with empty content", () => {
      assert.throws(
        () => buildChatRequest({ messages: [{ role: "user", content: "   " }] }),
        /content is required/
      );
    });

    test("rejects unsupported roles", () => {
      assert.throws(
        () => buildChatRequest({ messages: [{ role: "tool", content: "Hi" }] }),
        /messages\[0\]\.role is invalid/
      );
    });

    test("rejects unknown role names", () => {
      assert.throws(
        () => buildChatRequest({ messages: [{ role: "admin", content: "Hi" }] }),
        /role is invalid/
      );
    });

    test("rejects temperature outside the supported range", () => {
      assert.throws(
        () => buildChatRequest({
          messages: [{ role: "user", content: "Hi" }],
          temperature: 3,
        }),
        /temperature/
      );
    });

    test("rejects temperature at boundary below 0", () => {
      assert.throws(
        () => buildChatRequest({
          messages: [{ role: "user", content: "Hi" }],
          temperature: -0.1,
        }),
        /temperature/
      );
    });

    test("rejects max_tokens outside range", () => {
      assert.throws(
        () => buildChatRequest({
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 0,
        }),
        /max_tokens/
      );
    });

    test("rejects max_tokens above 32768", () => {
      assert.throws(
        () => buildChatRequest({
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 32769,
        }),
        /max_tokens/
      );
    });
  });
});
