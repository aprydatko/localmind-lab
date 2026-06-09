import assert from "node:assert/strict";
import test, { describe, beforeEach } from "node:test";
import { runBankingAgent } from "../src/banking-agent.js";
import { bankingTools } from "../src/tools/banking-tools.js";
import { BankingService } from "../src/services/banking.js";

describe("banking-agent", () => {
  describe("bankingTools", () => {
    test("defines balance, transaction, and exchange-rate tools", () => {
      assert.deepEqual(
        bankingTools.map((tool) => tool.function.name),
        ["get_balance", "get_transactions", "get_exchange_rate"]
      );
    });

    test("all tools have type 'function'", () => {
      bankingTools.forEach((tool) => {
        assert.equal(tool.type, "function");
      });
    });

    test("all tools disallow additionalProperties", () => {
      bankingTools.forEach((tool) => {
        assert.equal(tool.function.parameters.additionalProperties, false);
      });
    });

    test("get_transactions has integer limit with min 1 and max 10", () => {
      const txTool = bankingTools.find((t) => t.function.name === "get_transactions");
      const limit = txTool.function.parameters.properties.limit;
      assert.equal(limit.type, "integer");
      assert.equal(limit.minimum, 1);
      assert.equal(limit.maximum, 10);
    });
  });

  describe("runBankingAgent", () => {
    let bankingService;

    beforeEach(() => {
      bankingService = new BankingService();
    });

    test("executes a selected tool and sends its result back to the model", async () => {
      const requests = [];
      const client = {
        chat: async (request) => {
          requests.push(request);
          if (requests.length === 1) {
            return {
              choices: [{
                message: {
                  role: "assistant",
                  content: null,
                  tool_calls: [{
                    id: "call-1",
                    type: "function",
                    function: { name: "get_balance", arguments: "{}" },
                  }],
                },
              }],
            };
          }
          return { choices: [{ message: { content: "Your simulated balance is available." } }] };
        },
      };

      const result = await runBankingAgent({
        client,
        bankingService,
        request: { messages: [{ role: "user", content: "Balance?" }] },
      });

      assert.equal(requests.length, 2);
      assert.equal(result.toolCalls[0].name, "get_balance");
      assert.equal(result.toolCalls[0].result.currency, "UAH");
    });

    test("supports multiple tool calls in a single response", async () => {
      const requests = [];
      const client = {
        chat: async (request) => {
          requests.push(request);
          if (requests.length === 1) {
            return {
              choices: [{
                message: {
                  role: "assistant",
                  content: null,
                  tool_calls: [
                    {
                      id: "call-1",
                      type: "function",
                      function: { name: "get_balance", arguments: "{}" },
                    },
                    {
                      id: "call-2",
                      type: "function",
                      function: { name: "get_transactions", arguments: '{"limit": 2}' },
                    },
                  ],
                },
              }],
            };
          }
          return {
            choices: [{ message: { content: "Done processing your request." } }],
          };
        },
      };

      const result = await runBankingAgent({
        client,
        bankingService,
        request: { messages: [{ role: "user", content: "Balance and last transactions?" }] },
      });

      assert.equal(result.toolCalls.length, 2);
      assert.equal(result.toolCalls[0].name, "get_balance");
      assert.equal(result.toolCalls[1].name, "get_transactions");
      assert.equal(result.toolCalls[1].result.length, 2);
      assert.deepEqual(
        result.trace.map((step) => step.type),
        ["model", "tool", "tool", "model"]
      );
    });

    test("supports multiple iterations and aggregates token usage", async () => {
      const responses = [
        {
          choices: [{
            message: {
              role: "assistant",
              content: null,
              tool_calls: [{
                id: "balance-call",
                type: "function",
                function: { name: "get_balance", arguments: "{}" },
              }],
            },
          }],
          usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 },
        },
        {
          choices: [{
            message: {
              role: "assistant",
              content: null,
              tool_calls: [{
                id: "rate-call",
                type: "function",
                function: {
                  name: "get_exchange_rate",
                  arguments: JSON.stringify({ from: "UAH", to: "USD" }),
                },
              }],
            },
          }],
          usage: { prompt_tokens: 140, completion_tokens: 12, total_tokens: 152 },
        },
        {
          choices: [{ message: { role: "assistant", content: "The simulated conversion is complete." } }],
          usage: { prompt_tokens: 180, completion_tokens: 20, total_tokens: 200 },
        },
      ];
      const client = { chat: async () => responses.shift() };

      const result = await runBankingAgent({
        client,
        bankingService,
        request: {
          model: "test-model",
          messages: [{ role: "user", content: "Balance in USD?" }],
        },
      });

      assert.equal(result.iterations, 3);
      assert.deepEqual(
        result.toolCalls.map((call) => call.name),
        ["get_balance", "get_exchange_rate"]
      );
      assert.deepEqual(result.usage, {
        prompt_tokens: 420,
        completion_tokens: 42,
        total_tokens: 462,
      });
      assert.deepEqual(
        result.trace.map((step) => step.type),
        ["model", "tool", "model", "tool", "model"]
      );
    });

    test("stops after maxIterations and returns stopped flag", async () => {
      const client = {
        chat: async () => ({
          choices: [{
            message: {
              role: "assistant",
              content: null,
              tool_calls: [{
                id: "endless-call",
                type: "function",
                function: { name: "get_balance", arguments: "{}" },
              }],
            },
          }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      };

      const result = await runBankingAgent({
        client,
        bankingService,
        request: { messages: [{ role: "user", content: "Loop" }] },
        maxIterations: 3,
      });

      assert.equal(result.iterations, 3);
      assert.equal(result.stopped, true);
      assert.equal(result.answer, "The agent stopped after reaching the maximum number of iterations.");
    });

    test("maxIterations defaults to 5", async () => {
      let callCount = 0;
      const client = {
        chat: async () => {
          callCount++;
          return {
            choices: [{
              message: {
                role: "assistant",
                content: null,
                tool_calls: [{
                  id: "call-${callCount}",
                  type: "function",
                  function: { name: "get_balance", arguments: "{}" },
                }],
              },
            }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          };
        },
      };

      const result = await runBankingAgent({
        client,
        bankingService,
        request: { messages: [{ role: "user", content: "Loop" }] },
      });

      assert.equal(callCount, 5);
      assert.equal(result.stopped, true);
    });

    test("handles invalid JSON in tool arguments gracefully", async () => {
      const client = {
        chat: async () => ({
          choices: [{
            message: {
              role: "assistant",
              content: null,
              tool_calls: [{
                id: "bad-call",
                type: "function",
                function: { name: "get_balance", arguments: "not json" },
              }],
            },
          }],
        }),
      };

      await assert.rejects(
        () => runBankingAgent({
          client,
          bankingService,
          request: { messages: [{ role: "user", content: "Test" }] },
        }),
        /invalid JSON arguments/
      );
    });
  });
});
