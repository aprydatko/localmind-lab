import assert from "node:assert/strict";
import test, { describe, beforeEach, mock } from "node:test";
import { LlamaClient, fallbackModel, client as defaultClient } from "../src/llama-client.js";

describe("LlamaClient", () => {
  describe("constructor", () => {
    test("trims trailing slash from baseUrl", () => {
      const client = new LlamaClient({ baseUrl: "http://localhost:8080/" });
      assert.equal(client.baseUrl, "http://localhost:8080");
    });

    test("keeps baseUrl without trailing slash unchanged", () => {
      const client = new LlamaClient({ baseUrl: "http://localhost:8080" });
      assert.equal(client.baseUrl, "http://localhost:8080");
    });

    test("stores apiKey when provided", () => {
      const client = new LlamaClient({ baseUrl: "http://localhost", apiKey: "secret" });
      assert.equal(client.apiKey, "secret");
    });

    test("defaults apiKey to empty string", () => {
      const client = new LlamaClient({ baseUrl: "http://localhost" });
      assert.equal(client.apiKey, "");
    });

    test("defaults timeoutMs to 120000", () => {
      const client = new LlamaClient({ baseUrl: "http://localhost" });
      assert.equal(client.timeoutMs, 120_000);
    });
  });

  describe("headers", () => {
    test("includes content-type header", () => {
      const client = new LlamaClient({ baseUrl: "http://localhost" });
      assert.equal(client.headers()["content-type"], "application/json");
    });

    test("includes Authorization header when apiKey is set", () => {
      const client = new LlamaClient({ baseUrl: "http://localhost", apiKey: "token123" });
      assert.equal(client.headers().authorization, "Bearer token123");
    });

    test("omits Authorization header when apiKey is empty", () => {
      const client = new LlamaClient({ baseUrl: "http://localhost" });
      assert.equal(client.headers().authorization, undefined);
    });
  });

  describe("chat", () => {
    test("returns parsed JSON from a successful response", async () => {
      const fetchMock = mock.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Hello there" } }],
        }),
      }));

      const client = new LlamaClient({
        baseUrl: "http://localhost:8080",
        fetchImplementation: fetchMock,
      });

      const result = await client.chat({ model: "test", messages: [] });

      assert.equal(result.choices[0].message.content, "Hello there");
    });

    test("sends correct request to the API", async () => {
      const fetchMock = mock.fn(async (url, options) => ({
        ok: true,
        json: async () => ({ choices: [] }),
      }));

      const client = new LlamaClient({
        baseUrl: "http://localhost:8080",
        fetchImplementation: fetchMock,
      });

      await client.chat({ model: "test", messages: [{ role: "user", content: "hi" }] });

      assert.equal(fetchMock.mock.callCount(), 1);
      const [url, options] = fetchMock.mock.calls[0].arguments;
      assert.equal(url, "http://localhost:8080/v1/chat/completions");
      assert.equal(options.method, "POST");
      const body = JSON.parse(options.body);
      assert.equal(body.model, "test");
      assert.deepEqual(body.messages, [{ role: "user", content: "hi" }]);
    });

    test("includes custom headers when provided", async () => {
      const fetchMock = mock.fn(async (url, options) => ({
        ok: true,
        json: async () => ({ choices: [] }),
      }));

      const client = new LlamaClient({
        baseUrl: "http://localhost",
        fetchImplementation: fetchMock,
      });

      await client.request("/test", {
        headers: { "x-custom": "value" },
      });

      const options = fetchMock.mock.calls[0].arguments[1];
      assert.equal(options.headers["x-custom"], "value");
      assert.equal(options.headers["content-type"], "application/json");
    });

    test("throws with error message from response when not OK", async () => {
      const fetchMock = mock.fn(async () => ({
        ok: false,
        json: async () => ({ error: { message: "Model not loaded" } }),
      }));

      const client = new LlamaClient({
        baseUrl: "http://localhost",
        apiKey: "key",
        fetchImplementation: fetchMock,
      });

      await assert.rejects(
        () => client.chat({ messages: [] }),
        /Model not loaded/
      );
    });

    test("throws with fallback error message when no structured error", async () => {
      const fetchMock = mock.fn(async () => ({
        ok: false,
        json: async () => ({}),
      }));

      const client = new LlamaClient({
        baseUrl: "http://localhost",
        fetchImplementation: fetchMock,
      });

      await assert.rejects(
        () => client.chat({ messages: [] }),
        /llama.cpp request failed/
      );
    });
  });
});
