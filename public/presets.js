/**
 * Presets and Configuration Constants
 */

export const presets = {
  system: [
    {
      role: 'system',
      content:
        'You are a JavaScript tutor. Answer concisely in Ukrainian and include exactly one code example.',
    },
    {
      role: 'user',
      content: 'Explain the difference between map and forEach.',
    },
  ],
  fewshot: [
    {
      role: 'system',
      content:
        'Classify sentiment using exactly one label: positive, neutral, or negative.',
    },
    { role: 'user', content: 'This release is excellent!' },
    { role: 'assistant', content: 'positive' },
    { role: 'user', content: 'The application sometimes freezes.' },
  ],
  xml: [
    {
      role: 'system',
      content:
        'Follow <instructions>. Use only information inside <context>. Return JSON only.',
    },
    {
      role: 'user',
      content: `<context>Mars has two moons: Phobos and Deimos.</context>
<instructions>List the moons of Mars.</instructions>
<constraints>Use the key "moons".</constraints>`,
    },
  ],
  reasoning: [
    {
      role: 'system',
      content:
        'Solve the task. Give the final answer and a concise, verifiable justification in three steps. Do not reveal private hidden reasoning.',
    },
    {
      role: 'user',
      content:
        'A box contains 24 pencils. One third are blue and the rest are red. How many are red?',
    },
  ],
  document: [
    {
      role: 'user',
      content:
        'Analyze this document: Invoice INV-42 requests EUR 9,800. Payment is 45 days overdue and the supplier bank account recently changed.',
    },
  ],
  banking: [
    {
      role: 'user',
      content:
        'What is my simulated balance, show my last two transactions, and convert the balance from UAH to USD?',
    },
  ],
  rag: [
    {
      role: 'user',
      content:
        'What is the access code for Project Nexus and what happens if the resonance drops below 400 Hz?',
    },
  ],
};

export const modeHelp = {
  chat: 'Звичайна повна відповідь через /v1/chat/completions.',
  stream: "Текст з'являється частинами через Server-Sent Events.",
  rag: 'Шукає релевантні чанки з папки docs/ (наприклад, Project Nexus) і передає їх як контекст.',
  structured:
    'Сервер вимагає JSON, перевіряє його Zod-схемою і повторює запит до 3 разів.',
  banking:
    'Модель обирає одну з 3 mock-функцій; сервер виконує її та повертає результат моделі.',
};
