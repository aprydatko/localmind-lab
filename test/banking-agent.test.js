import assert from "node:assert/strict";
import test from "node:test";
import { bankingTools, runBankingAgent } from "../src/banking-agent.js";

test("defines balance, transaction, and exchange-rate tools", () => {
  assert.deepEqual(
    bankingTools.map((tool) => tool.function.name),
    ["get_balance", "get_transactions", "get_exchange_rate"]
  );
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
                function: { name: "get_balance", arguments: "{}" }
              }]
            }
          }]
        };
      }

      return { choices: [{ message: { content: "Your simulated balance is available." } }] };
    }
  };

  const result = await runBankingAgent({
    client,
    request: { messages: [{ role: "user", content: "Balance?" }] }
  });

  assert.equal(requests.length, 2);
  assert.equal(result.toolCalls[0].name, "get_balance");
  assert.equal(result.toolCalls[0].result.currency, "UAH");
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
            function: { name: "get_balance", arguments: "{}" }
          }]
        }
      }],
      usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 }
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
              arguments: JSON.stringify({ from: "UAH", to: "USD" })
            }
          }]
        }
      }],
      usage: { prompt_tokens: 140, completion_tokens: 12, total_tokens: 152 }
    },
    {
      choices: [{
        message: { role: "assistant", content: "The simulated conversion is complete." }
      }],
      usage: { prompt_tokens: 180, completion_tokens: 20, total_tokens: 200 }
    }
  ];
  const client = { chat: async () => responses.shift() };

  const result = await runBankingAgent({
    client,
    request: {
      model: "test-model",
      messages: [{ role: "user", content: "Balance in USD?" }]
    }
  });

  assert.equal(result.iterations, 3);
  assert.deepEqual(
    result.toolCalls.map((call) => call.name),
    ["get_balance", "get_exchange_rate"]
  );
  assert.deepEqual(result.usage, {
    prompt_tokens: 420,
    completion_tokens: 42,
    total_tokens: 462
  });
  assert.deepEqual(
    result.trace.map((step) => step.type),
    ["model", "tool", "model", "tool", "model"]
  );
});
