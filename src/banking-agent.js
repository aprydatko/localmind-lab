const account = {
  currency: "UAH",
  available: 12_450.75,
  transactions: [
    { date: "2026-06-07", description: "Grocery store", amount: -842.30 },
    { date: "2026-06-06", description: "Salary", amount: 32_000 },
    { date: "2026-06-05", description: "Internet", amount: -399 }
  ]
};

export const bankingTools = [
  {
    type: "function",
    function: {
      name: "get_balance",
      description: "Get the current mock account balance and its currency.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  },
  {
    type: "function",
    function: {
      name: "get_transactions",
      description: "Get the most recent mock account transactions.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 10,
            description: "Number of recent transactions to return."
          }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_exchange_rate",
      description: "Get a mock exchange rate between two supported currencies.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", enum: ["UAH", "USD", "EUR"] },
          to: { type: "string", enum: ["UAH", "USD", "EUR"] }
        },
        required: ["from", "to"],
        additionalProperties: false
      }
    }
  }
];

const ratesToUah = { UAH: 1, USD: 41.25, EUR: 47.10 };

const executeTool = (name, args) => {
  if (name === "get_balance") {
    return { currency: account.currency, available: account.available };
  }

  if (name === "get_transactions") {
    return account.transactions.slice(0, args.limit || 5);
  }

  if (name === "get_exchange_rate") {
    return {
      from: args.from,
      to: args.to,
      rate: ratesToUah[args.from] / ratesToUah[args.to],
      mock: true
    };
  }

  throw new Error(`Unknown tool: ${name}`);
};

const addUsage = (total, usage = {}) => ({
  prompt_tokens: total.prompt_tokens + (usage.prompt_tokens || 0),
  completion_tokens: total.completion_tokens + (usage.completion_tokens || 0),
  total_tokens: total.total_tokens + (usage.total_tokens || 0)
});

const parseArguments = (call) => {
  try {
    return JSON.parse(call.function.arguments || "{}");
  } catch {
    throw new Error(`Tool ${call.function.name} returned invalid JSON arguments`);
  }
};

export const runBankingAgent = async ({ client, request, maxIterations = 5 }) => {
  const messages = [...request.messages];
  const trace = [];
  const toolCalls = [];
  let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  console.log("\n[agent] start", { model: request.model, maxIterations });

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    console.log(`[agent] iteration ${iteration}: requesting model decision`);
    const completion = await client.chat({
      ...request,
      messages,
      tools: bankingTools,
      tool_choice: "auto"
    });
    const assistant = completion.choices?.[0]?.message || { role: "assistant", content: "" };
    const calls = assistant.tool_calls || [];
    usage = addUsage(usage, completion.usage);

    trace.push({
      type: "model",
      iteration,
      decision: calls.length > 0 ? "tool_calls" : "final_answer",
      toolNames: calls.map((call) => call.function.name),
      usage: completion.usage || {}
    });
    console.log(`[agent] iteration ${iteration}: model decision`, {
      decision: calls.length > 0 ? "tool_calls" : "final_answer",
      tools: calls.map((call) => call.function.name),
      usage: completion.usage
    });

    if (calls.length === 0) {
      console.log("[agent] final answer", assistant.content);
      return {
        answer: assistant.content || "",
        toolCalls,
        trace,
        iterations: iteration,
        usage
      };
    }

    messages.push(assistant);

    for (const call of calls) {
      const args = parseArguments(call);
      const result = executeTool(call.function.name, args);
      const toolCall = {
        id: call.id,
        iteration,
        name: call.function.name,
        arguments: args,
        result
      };
      toolCalls.push(toolCall);
      trace.push({ type: "tool", ...toolCall });
      console.log(`[tool] ${call.function.name}`, { arguments: args, result });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result)
      });
    }
  }

  console.warn("[agent] stopped: maximum iterations reached", { maxIterations });
  return {
    answer: "The agent stopped after reaching the maximum number of iterations.",
    toolCalls,
    trace,
    iterations: maxIterations,
    stopped: true,
    usage
  };
};
