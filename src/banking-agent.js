import { bankingTools } from "./tools/banking-tools.js";

const addUsage = (total, usage = {}) => ({
  prompt_tokens: total.prompt_tokens + (usage.prompt_tokens || 0),
  completion_tokens: total.completion_tokens + (usage.completion_tokens || 0),
  total_tokens: total.total_tokens + (usage.total_tokens || 0),
});

const parseArguments = (call) => {
  try {
    return JSON.parse(call.function.arguments || "{}");
  } catch {
    throw new Error(
      `Tool ${call.function.name} returned invalid JSON arguments`,
    );
  }
};

export const runBankingAgent = async ({
  client,
  request,
  bankingService,
  maxIterations = 5,
}) => {
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
      tool_choice: "auto",
    });
    const assistant = completion.choices?.[0]?.message || {
      role: "assistant",
      content: "",
    };
    const calls = assistant.tool_calls || [];
    usage = addUsage(usage, completion.usage);

    trace.push({
      type: "model",
      iteration,
      decision: calls.length > 0 ? "tool_calls" : "final_answer",
      toolNames: calls.map((call) => call.function.name),
      usage: completion.usage || {},
    });
    console.log(`[agent] iteration ${iteration}: model decision`, {
      decision: calls.length > 0 ? "tool_calls" : "final_answer",
      tools: calls.map((call) => call.function.name),
      usage: completion.usage,
    });

    if (calls.length === 0) {
      console.log("[agent] final answer", assistant.content);
      return {
        answer: assistant.content || "",
        toolCalls,
        trace,
        iterations: iteration,
        usage,
      };
    }

    messages.push(assistant);

    for (const call of calls) {
      const args = parseArguments(call);
      const result = bankingService.executeTool(call.function.name, args);
      const toolCall = {
        id: call.id,
        iteration,
        name: call.function.name,
        arguments: args,
        result,
      };
      toolCalls.push(toolCall);
      trace.push({ type: "tool", ...toolCall });
      console.log(`[tool] ${call.function.name}`, { arguments: args, result });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  console.warn("[agent] stopped: maximum iterations reached", {
    maxIterations,
  });
  return {
    answer:
      "The agent stopped after reaching the maximum number of iterations.",
    toolCalls,
    trace,
    iterations: maxIterations,
    stopped: true,
    usage,
  };
};
