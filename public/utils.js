/**
 * Utility Functions
 * Non-UI helper functions used across the application
 */

export const compactLines = (value) =>
  value
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);

export const parseArguments = (jsonString) => {
  try {
    return JSON.parse(jsonString || '{}');
  } catch {
    throw new Error('Invalid JSON arguments');
  }
};

export const getMessages = (messagesContainer) => {
  return [...messagesContainer.querySelectorAll('.message')]
    .map((message) => ({
      role: message.querySelector('select').value,
      content: message.querySelector('textarea').value,
    }))
    .filter((message) => message.content.trim());
};

export const buildPrompt = (builderElements) => {
  const role = `${
    builderElements.role.value.trim() || 'You are a helpful assistant'
  }. Respond in ${builderElements.language.value}.`;
  const task = builderElements.task.value.trim() || "Complete the user's task.";
  const context = builderElements.context.value.trim();
  const constraints = compactLines(builderElements.constraints.value);
  const format = builderElements.format.value;
  const technique = builderElements.technique.value;
  let userPrompt;

  if (technique === 'xml') {
    userPrompt = `<task>\n${task}\n</task>
${context ? `<context>\n${context}\n</context>\n` : ''}<constraints>
${constraints.length ? constraints.map((item) => `- ${item}`).join('\n') : '- Follow the task exactly'}
- Return ${format}.
</constraints>`;
  } else {
    const sections = [`Task:\n${task}`];
    if (context) sections.push(`Context:\n${context}`);
    if (constraints.length)
      sections.push(
        `Constraints:\n${constraints.map((item) => `- ${item}`).join('\n')}`
      );
    sections.push(`Output format:\n${format}.`);
    if (technique === 'reasoning') {
      sections.push(
        'Provide a concise, verifiable justification. Do not reveal private hidden reasoning.'
      );
    }
    userPrompt = sections.join('\n\n');
  }

  return {
    system: role,
    user: userPrompt,
    preview: `SYSTEM\n${role}\n\nUSER\n${userPrompt}`,
  };
};

export const normalizedResult = (data, mode) => {
  if (mode === 'structured') {
    return {
      content: JSON.stringify(data.data, null, 2),
      finishReason: data.fallback
        ? 'fallback'
        : `valid after ${data.attempts} attempt(s)`,
      usage: data.usage,
    };
  }

  if (mode === 'banking') {
    return {
      content: data.answer,
      finishReason: data.stopped
        ? 'max iterations'
        : `${data.iterations} agent iteration(s)`,
      usage: data.usage,
      trace: data.trace,
    };
  }

  const message = data.choices?.[0]?.message || {};
  let contentText = message.content || '';

  if (message.reasoning_content) {
    const reasoning = `> **Thinking:**\n> ${message.reasoning_content.replace(
      /\n/g,
      '\n> '
    )}\n\n`;
    contentText = reasoning + contentText;
  }

  if (mode === 'rag' && data.sources) {
    contentText += `\n\n**Sources:** ${data.sources.join(', ')}`;
  }

  return {
    content: contentText || 'Модель не повернула текст.',
    finishReason: data.choices?.[0]?.finish_reason || 'unknown',
    usage: data.usage,
    chunks: data.ragChunks || [],
  };
};
