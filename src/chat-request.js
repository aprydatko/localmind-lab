const ROLES = new Set(["system", "user", "assistant"]);

const requireNumber = (value, name, min, max) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${name} must be a number from ${min} to ${max}`);
  }

  return number;
};

export const buildChatRequest = (input, fallbackModel = "", options = {}) => {
  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    throw new Error("messages must be a non-empty array");
  }

  const messages = input.messages.map((message, index) => {
    if (!ROLES.has(message?.role)) {
      throw new Error(`messages[${index}].role is invalid`);
    }

    if (typeof message.content !== "string" || !message.content.trim()) {
      throw new Error(`messages[${index}].content is required`);
    }

    return { role: message.role, content: message.content.trim() };
  });

  const request = {
    model: String(input.model || fallbackModel || "local-model"),
    messages,
    temperature: requireNumber(input.temperature ?? 0.7, "temperature", 0, 2),
    max_tokens: requireNumber(input.max_tokens ?? 512, "max_tokens", 1, 32768),
    stream: Boolean(options.stream)
  };

  if (Array.isArray(options.tools) && options.tools.length > 0) {
    request.tools = options.tools;
    request.tool_choice = "auto";
  }

  return request;
};
