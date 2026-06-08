/**
 * UI Rendering Functions
 * All DOM manipulation and rendering logic
 */

import { renderMarkdown } from './markdown.js';

export const addMessage = (messagesContainer, role = 'user', content = '') => {
  const node = document
    .querySelector('#messageTemplate')
    .content.cloneNode(true);
  const article = node.querySelector('.message');
  article.querySelector('select').value = role;
  article.querySelector('textarea').value = content;
  article.querySelector('.remove').addEventListener('click', () => {
    article.remove();
  });
  messagesContainer.append(node);
};

export const setMessages = (messagesContainer, messages) => {
  messagesContainer.replaceChildren();
  messages.forEach(({ role, content }) =>
    addMessage(messagesContainer, role, content)
  );
};

export const renderActiveCapability = (elements, activeCapability) => {
  if (!elements.activeCapability) return;

  if (activeCapability?.type === 'skill') {
    elements.activeCapability.textContent =
      `Active skill: ${activeCapability.name}` +
      (activeCapability.details ? ` — ${activeCapability.details}` : '');
    return;
  }

  if (activeCapability?.type === 'mode') {
    elements.activeCapability.textContent = `Active mode: ${activeCapability.name}`;
    return;
  }

  elements.activeCapability.textContent = `Active: ${elements.mode.value}`;
};

export const renderCapabilities = (
  list,
  capabilities,
  activeCatalogTab,
  onSkillActivate
) => {
  list.replaceChildren();
  const items = capabilities[activeCatalogTab] || [];

  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'capability-card';

    if (activeCatalogTab === 'tools') {
      const fn = item.function;
      card.innerHTML = `
        <div class="capability-head">
          <div><span>${item.category}</span><h3>${fn.name}</h3></div>
          <b>${item.status}</b>
        </div>
        <p>${fn.description}</p>
        <details>
          <summary>Parameters JSON Schema</summary>
          <pre></pre>
        </details>`;
      card.querySelector('pre').textContent = JSON.stringify(
        fn.parameters,
        null,
        2
      );
    } else {
      card.innerHTML = `
        <div class="capability-head">
          <div><span>skill</span><h3>${item.name}</h3></div>
          <b class="${item.status === 'ready' ? 'ready' : 'planned'}">${item.status}</b>
        </div>
        <p>${item.description}</p>
        <div class="capability-actions">
          <button class="skill-action" type="button" ${
            item.status !== 'ready' ? 'disabled' : ''
          }>
            ${item.status === 'ready' ? 'Use skill' : 'Planned'}
          </button>
        </div>`;

      card.querySelector('button')?.addEventListener('click', () => {
        if (item.status === 'ready') onSkillActivate(item);
      });
    }

    list.append(card);
  });
};

export const renderUploadedFiles = (container, files = []) => {
  container.replaceChildren();
  const supportedExts = ['.pdf', '.md', '.txt'];
  const filtered = files.filter((f) => {
    const ext = f.substring(f.lastIndexOf('.')).toLowerCase();
    return supportedExts.includes(ext);
  });

  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-message';
    empty.textContent = 'Немає завантажених файлів';
    container.append(empty);
    return;
  }

  const title = document.createElement('div');
  title.className = 'uploaded-files-head';
  title.textContent = 'Файли в docs/';
  container.append(title);

  filtered.forEach((filename) => {
    const item = document.createElement('div');
    item.className = 'uploaded-file';

    const label = document.createElement('span');
    label.textContent = filename;
    item.append(label);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary-btn';
    button.textContent = 'Видалити';
    button.addEventListener('click', () => {
      container.dispatchEvent(
        new CustomEvent('deleteFile', { detail: { filename } })
      );
    });
    item.append(button);

    container.append(item);
  });
};

export const renderChunkDebug = (chunks) => {
  if (!chunks || chunks.length === 0) return null;

  const section = document.createElement('section');
  section.className = 'rag-chunks';

  const header = document.createElement('div');
  header.className = 'chunks-head';
  header.textContent = 'Retrieved chunks';
  section.append(header);

  chunks.forEach((chunk, index) => {
    const article = document.createElement('article');
    article.className = 'chunk-item';

    const meta = document.createElement('div');
    meta.className = 'chunk-meta';
    meta.textContent = `Chunk ${index + 1} · Source: ${chunk.source}`;
    article.append(meta);

    const pre = document.createElement('pre');
    pre.textContent = chunk.content.slice(0, 800);
    article.append(pre);

    section.append(article);
  });

  return section;
};

export const renderAgentTrace = (trace) => {
  const details = document.createElement('details');
  details.className = 'agent-trace';
  details.open = true;
  const summary = document.createElement('summary');
  summary.textContent = `Agent Loop trace (${trace.length} steps)`;
  details.append(summary);

  trace.forEach((step) => {
    const item = document.createElement('article');
    item.className = `trace-step ${step.type}`;

    if (step.type === 'model') {
      item.innerHTML = `
        <span>MODEL · iteration ${step.iteration}</span>
        <strong>${
          step.decision === 'tool_calls'
            ? 'Selected tool(s)'
            : 'Returned final answer'
        }</strong>
        <p>${step.toolNames?.length ? step.toolNames.join(', ') : 'No tool selected'}</p>
        <small>input ${step.usage?.prompt_tokens ?? '—'} · output ${
          step.usage?.completion_tokens ?? '—'
        }</small>`;
    } else {
      const title = document.createElement('span');
      const name = document.createElement('strong');
      const code = document.createElement('pre');
      title.textContent = `TOOL · iteration ${step.iteration}`;
      name.textContent = step.name;
      code.textContent = JSON.stringify(
        {
          arguments: step.arguments,
          result: step.result,
        },
        null,
        2
      );
      item.append(title, name, code);
    }

    details.append(item);
  });

  return details;
};

export const resultCard = (data, temperature, mode, streaming = false) => {
  const result = streaming
    ? { content: '', finishReason: 'streaming', usage: {} }
    : data;
  const card = document.createElement('article');
  card.className = 'result-card';
  card.innerHTML = `
    <div class="result-head">
      <strong>temperature ${temperature}</strong>
      <span>${result.finishReason}</span>
    </div>
    <div class="answer"></div>
    <section class="token-usage">
      <div>
        <span>INPUT / PROMPT</span>
        <strong>${result.usage?.prompt_tokens ?? '—'}</strong>
        <small>messages + system prompt + tools + попередні результати</small>
      </div>
      <div>
        <span>OUTPUT / COMPLETION</span>
        <strong>${result.usage?.completion_tokens ?? '—'}</strong>
        <small>токени, які згенерувала модель</small>
      </div>
      <div>
        <span>TOTAL</span>
        <strong>${result.usage?.total_tokens ?? '—'}</strong>
        <small>input + output для всіх LLM-викликів</small>
      </div>
    </section>`;
  renderMarkdown(card.querySelector('.answer'), result.content);

  if (result.chunks?.length) {
    const chunkDebug = renderChunkDebug(result.chunks);
    if (chunkDebug) {
      card.append(chunkDebug);
    }
  }

  if (result.trace?.length) {
    card.append(renderAgentTrace(result.trace));
  }

  return card;
};

export const updatePromptPreview = (builder, buildPrompt) => {
  const builderElements = {
    role: builder.role,
    language: builder.language,
    task: builder.task,
    context: builder.context,
    constraints: builder.constraints,
    format: builder.format,
    technique: builder.technique,
  };
  builder.preview.textContent = buildPrompt(builderElements).preview;
};
