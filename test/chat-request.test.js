import assert from "node:assert/strict";
import test from "node:test";
import { buildChatRequest } from "../src/chat-request.js";

test("builds an OpenAI-compatible chat request", () => {
  const result = buildChatRequest({
    messages: [{ role: "user", content: " Hello " }],
    temperature: 0,
    max_tokens: 128
  }, "demo");

  assert.deepEqual(result, {
    model: "demo",
    messages: [{ role: "user", content: "Hello" }],
    temperature: 0,
    max_tokens: 128,
    stream: false
  });
});

test("rejects unsupported roles", () => {
  assert.throws(
    () => buildChatRequest({ messages: [{ role: "tool", content: "Hi" }] }),
    /role is invalid/
  );
});

test("rejects temperature outside the supported range", () => {
  assert.throws(
    () => buildChatRequest({
      messages: [{ role: "user", content: "Hi" }],
      temperature: 3
    }),
    /temperature/
  );
});

test("enables streaming when requested", () => {
  const result = buildChatRequest(
    { messages: [{ role: "user", content: "Hi" }] },
    "",
    { stream: true }
  );

  assert.equal(result.stream, true);
});
