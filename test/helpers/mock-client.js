export const createMockClient = (responses) => {
  const queue = [...responses];
  const calls = [];
  return {
    client: {
      chat: async (request) => {
        calls.push(request);
        const response = queue.shift();
        if (typeof response === "function") {
          return response(request, calls);
        }
        if (response === undefined) {
          throw new Error("Unexpected call to client.chat");
        }
        return response;
      },
    },
    calls,
  };
};

export const simpleModelResponse = (content) => ({
  choices: [{ message: { role: "assistant", content } }],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
});

export const toolCallResponse = (toolCalls, content = null, usage) => ({
  choices: [
    {
      message: { role: "assistant", content, tool_calls: toolCalls },
    },
  ],
  usage: usage || { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
});
