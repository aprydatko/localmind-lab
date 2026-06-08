/**
 * API Client Functions
 * All server communication consolidated here
 */

export const getEndpointForMode = (mode) =>
  ({
    chat: '/api/chat',
    rag: '/api/rag',
    structured: '/api/structured',
    banking: '/api/banking-agent',
  })[mode];

export const buildRequestBody = (messages, model, temperature, maxTokens) => ({
  model,
  messages,
  temperature,
  max_tokens: maxTokens,
});

export const requestCompletion = async (requestBody, endpoint) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Запит не вдався');
  return data;
};

export const streamCompletion = async (requestBody, onChunk) => {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok || !response.body) {
    const data = await response.json();
    throw new Error(data.error || 'Streaming request failed');
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let reasoning = '';
  let content = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const line = event.split('\n').find((item) => item.startsWith('data:'));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;
      const data = JSON.parse(payload);

      const delta = data.choices?.[0]?.delta || {};
      if (delta.reasoning_content) {
        reasoning += delta.reasoning_content;
      }
      if (delta.content) {
        content += delta.content;
      }

      const reasoningText = reasoning
        ? `> **Thinking:**\n> ${reasoning.replace(/\n/g, '\n> ')}\n\n`
        : '';
      onChunk(reasoningText + content);
    }
  }
};

export const loadModels = async () => {
  try {
    const response = await fetch('/api/models');
    const data = await response.json();
    return {
      models: data.data || [],
      offline: data.offline || false,
    };
  } catch {
    return {
      models: [],
      offline: true,
    };
  }
};

export const loadCapabilities = async () => {
  const response = await fetch('/api/capabilities');
  if (!response.ok) throw new Error('Не вдалося завантажити capabilities');
  return await response.json();
};

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  return await response.json();
};

export const getUploadedFiles = async () => {
  const response = await fetch('/api/uploads');
  if (!response.ok) throw new Error('Не вдалося завантажити список файлів');
  return await response.json();
};

export const deleteUploadedFile = async (filename) => {
  const response = await fetch(`/api/upload/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  return await response.json();
};
