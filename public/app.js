import { renderMarkdown } from "./markdown.js";

const elements = {
  messages: document.querySelector("#messages"),
  results: document.querySelector("#results"),
  error: document.querySelector("#error"),
  send: document.querySelector("#send"),
  compare: document.querySelector("#compare"),
  model: document.querySelector("#model"),
  mode: document.querySelector("#mode"),
  modeHelp: document.querySelector("#modeHelp"),
  temperature: document.querySelector("#temperature"),
  maxTokens: document.querySelector("#maxTokens")
};

const builder = {
  dialog: document.querySelector("#promptBuilder"),
  role: document.querySelector("#builderRole"),
  language: document.querySelector("#builderLanguage"),
  task: document.querySelector("#builderTask"),
  context: document.querySelector("#builderContext"),
  constraints: document.querySelector("#builderConstraints"),
  format: document.querySelector("#builderFormat"),
  technique: document.querySelector("#builderTechnique"),
  preview: document.querySelector("#promptPreview")
};

let capabilities = { tools: [], skills: [] };
let activeCatalogTab = "tools";

const presets = {
  system: [
    {
      role: "system",
      content: "You are a JavaScript tutor. Answer concisely in Ukrainian and include exactly one code example."
    },
    { role: "user", content: "Explain the difference between map and forEach." }
  ],
  fewshot: [
    {
      role: "system",
      content: "Classify sentiment using exactly one label: positive, neutral, or negative."
    },
    { role: "user", content: "This release is excellent!" },
    { role: "assistant", content: "positive" },
    { role: "user", content: "The application sometimes freezes." }
  ],
  xml: [
    {
      role: "system",
      content: "Follow <instructions>. Use only information inside <context>. Return JSON only."
    },
    {
      role: "user",
      content: `<context>Mars has two moons: Phobos and Deimos.</context>
<instructions>List the moons of Mars.</instructions>
<constraints>Use the key "moons".</constraints>`
    }
  ],
  reasoning: [
    {
      role: "system",
      content: "Solve the task. Give the final answer and a concise, verifiable justification in three steps. Do not reveal private hidden reasoning."
    },
    {
      role: "user",
      content: "A box contains 24 pencils. One third are blue and the rest are red. How many are red?"
    }
  ],
  document: [
    {
      role: "user",
      content: "Analyze this document: Invoice INV-42 requests EUR 9,800. Payment is 45 days overdue and the supplier bank account recently changed."
    }
  ],
  banking: [
    {
      role: "user",
      content: "What is my simulated balance, show my last two transactions, and convert the balance from UAH to USD?"
    }
  ]
};

const modeHelp = {
  chat: "Звичайна повна відповідь через /v1/chat/completions.",
  stream: "Текст з'являється частинами через Server-Sent Events.",
  structured: "Сервер вимагає JSON, перевіряє його Zod-схемою і повторює запит до 3 разів.",
  banking: "Модель обирає одну з 3 mock-функцій; сервер виконує її та повертає результат моделі."
};

const addMessage = (role = "user", content = "") => {
  const node = document.querySelector("#messageTemplate").content.cloneNode(true);
  const article = node.querySelector(".message");
  article.querySelector("select").value = role;
  article.querySelector("textarea").value = content;
  article.querySelector(".remove").addEventListener("click", () => article.remove());
  elements.messages.append(node);
};

const setMessages = (messages) => {
  elements.messages.replaceChildren();
  messages.forEach(({ role, content }) => addMessage(role, content));
};

const compactLines = (value) => value
  .split(/\r?\n|;/)
  .map((line) => line.trim())
  .filter(Boolean);

const buildPrompt = () => {
  const role = `${builder.role.value.trim() || "You are a helpful assistant"}. Respond in ${builder.language.value}.`;
  const task = builder.task.value.trim() || "Complete the user's task.";
  const context = builder.context.value.trim();
  const constraints = compactLines(builder.constraints.value);
  const format = builder.format.value;
  const technique = builder.technique.value;
  let userPrompt;

  if (technique === "xml") {
    userPrompt = `<task>\n${task}\n</task>
${context ? `<context>\n${context}\n</context>\n` : ""}<constraints>
${constraints.length ? constraints.map((item) => `- ${item}`).join("\n") : "- Follow the task exactly"}
- Return ${format}.
</constraints>`;
  } else {
    const sections = [`Task:\n${task}`];
    if (context) sections.push(`Context:\n${context}`);
    if (constraints.length) sections.push(`Constraints:\n${constraints.map((item) => `- ${item}`).join("\n")}`);
    sections.push(`Output format:\n${format}.`);
    if (technique === "reasoning") {
      sections.push("Provide a concise, verifiable justification. Do not reveal private hidden reasoning.");
    }
    userPrompt = sections.join("\n\n");
  }

  return {
    system: role,
    user: userPrompt,
    preview: `SYSTEM\n${role}\n\nUSER\n${userPrompt}`
  };
};

const updatePromptPreview = () => {
  builder.preview.textContent = buildPrompt().preview;
};

const getMessages = () => [...elements.messages.querySelectorAll(".message")]
  .map((message) => ({
    role: message.querySelector("select").value,
    content: message.querySelector("textarea").value
  }))
  .filter((message) => message.content.trim());

const requestBody = (temperature) => ({
  model: elements.model.value,
  messages: getMessages(),
  temperature,
  max_tokens: Number(elements.maxTokens.value)
});

const endpointForMode = () => ({
  chat: "/api/chat",
  structured: "/api/structured",
  banking: "/api/banking-agent"
})[elements.mode.value];

const requestCompletion = async (temperature) => {
  const response = await fetch(endpointForMode(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestBody(temperature))
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Запит не вдався");
  return data;
};

const normalizedResult = (data) => {
  if (elements.mode.value === "structured") {
    return {
      content: JSON.stringify(data.data, null, 2),
      finishReason: data.fallback ? "fallback" : `valid after ${data.attempts} attempt(s)`,
      usage: data.usage
    };
  }

  if (elements.mode.value === "banking") {
    return {
      content: data.answer,
      finishReason: data.stopped
        ? "max iterations"
        : `${data.iterations} agent iteration(s)`,
      usage: data.usage,
      trace: data.trace
    };
  }

  const message = data.choices?.[0]?.message || {};
  let contentText = message.content || "";
  
  if (message.reasoning_content) {
    const reasoning = `> **Thinking:**\n> ${message.reasoning_content.replace(/\n/g, '\n> ')}\n\n`;
    contentText = reasoning + contentText;
  }

  return {
    content: contentText || "Модель не повернула текст.",
    finishReason: data.choices?.[0]?.finish_reason || "unknown",
    usage: data.usage
  };
};

const resultCard = (data, temperature, streaming = false) => {
  const result = streaming
    ? { content: "", finishReason: "streaming", usage: {} }
    : normalizedResult(data);
  const card = document.createElement("article");
  card.className = "result-card";
  card.innerHTML = `
    <div class="result-head">
      <strong>temperature ${temperature}</strong>
      <span>${result.finishReason}</span>
    </div>
    <div class="answer"></div>
    <section class="token-usage">
      <div>
        <span>INPUT / PROMPT</span>
        <strong>${result.usage?.prompt_tokens ?? "—"}</strong>
        <small>messages + system prompt + tools + попередні результати</small>
      </div>
      <div>
        <span>OUTPUT / COMPLETION</span>
        <strong>${result.usage?.completion_tokens ?? "—"}</strong>
        <small>токени, які згенерувала модель</small>
      </div>
      <div>
        <span>TOTAL</span>
        <strong>${result.usage?.total_tokens ?? "—"}</strong>
        <small>input + output для всіх LLM-викликів</small>
      </div>
    </section>`;
  renderMarkdown(card.querySelector(".answer"), result.content);

  if (result.trace?.length) {
    card.append(agentTrace(result.trace));
  }

  return card;
};

const agentTrace = (trace) => {
  const details = document.createElement("details");
  details.className = "agent-trace";
  details.open = true;
  const summary = document.createElement("summary");
  summary.textContent = `Agent Loop trace (${trace.length} steps)`;
  details.append(summary);

  trace.forEach((step) => {
    const item = document.createElement("article");
    item.className = `trace-step ${step.type}`;

    if (step.type === "model") {
      item.innerHTML = `
        <span>MODEL · iteration ${step.iteration}</span>
        <strong>${step.decision === "tool_calls" ? "Selected tool(s)" : "Returned final answer"}</strong>
        <p>${step.toolNames?.length ? step.toolNames.join(", ") : "No tool selected"}</p>
        <small>input ${step.usage?.prompt_tokens ?? "—"} · output ${step.usage?.completion_tokens ?? "—"}</small>`;
    } else {
      const title = document.createElement("span");
      const name = document.createElement("strong");
      const code = document.createElement("pre");
      title.textContent = `TOOL · iteration ${step.iteration}`;
      name.textContent = step.name;
      code.textContent = JSON.stringify({
        arguments: step.arguments,
        result: step.result
      }, null, 2);
      item.append(title, name, code);
    }

    details.append(item);
  });

  return details;
};

const streamCompletion = async (temperature) => {
  const card = resultCard({}, temperature, true);
  const output = card.querySelector(".answer");
  let markdown = "";
  elements.results.append(card);
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestBody(temperature))
  });

  if (!response.ok || !response.body) {
    const data = await response.json();
    throw new Error(data.error || "Streaming request failed");
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let reasoning = "";
  let content = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const line = event.split("\n").find((item) => item.startsWith("data:"));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      const data = JSON.parse(payload);
      
      const delta = data.choices?.[0]?.delta || {};
      if (delta.reasoning_content) {
        reasoning += delta.reasoning_content;
      }
      if (delta.content) {
        content += delta.content;
      }
      
      const reasoningText = reasoning ? `> **Thinking:**\n> ${reasoning.replace(/\n/g, '\n> ')}\n\n` : "";
      renderMarkdown(output, reasoningText + content);
    }
  }
};

const run = async (temperatures) => {
  elements.error.hidden = true;
  elements.results.replaceChildren();
  elements.send.disabled = true;
  elements.compare.disabled = true;

  try {
    if (elements.mode.value === "stream") {
      for (const temperature of temperatures) await streamCompletion(temperature);
      return;
    }

    const results = await Promise.all(
      temperatures.map(async (temperature) => ({
        temperature,
        data: await requestCompletion(temperature)
      }))
    );
    results.forEach(({ data, temperature }) => {
      elements.results.append(resultCard(data, temperature));
    });
  } catch (error) {
    elements.error.textContent = error.message;
    elements.error.hidden = false;
  } finally {
    elements.send.disabled = false;
    elements.compare.disabled = elements.mode.value !== "chat";
  }
};

const updateMode = () => {
  elements.modeHelp.textContent = modeHelp[elements.mode.value];
  elements.compare.disabled = elements.mode.value !== "chat";
  if (elements.mode.value === "structured") setMessages(presets.document);
  if (elements.mode.value === "banking") setMessages(presets.banking);
};

const loadModels = async () => {
  const status = document.querySelector("#connection");
  try {
    const response = await fetch("/api/models");
    const data = await response.json();
    const models = data.data || [];
    document.querySelector("#models").replaceChildren(
      ...models.map(({ id }) => {
        const option = document.createElement("option");
        option.value = id;
        return option;
      })
    );
    if (models[0]) elements.model.value = models[0].id;
    status.innerHTML = `<span></span> ${data.offline ? "сервер UI готовий" : "llama.cpp online"}`;
    status.classList.toggle("offline", Boolean(data.offline));
  } catch {
    status.innerHTML = "<span></span> недоступно";
    status.classList.add("offline");
  }
};

const renderCapabilities = () => {
  const list = document.querySelector("#capabilityList");
  list.replaceChildren();
  const items = capabilities[activeCatalogTab] || [];

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "capability-card";

    if (activeCatalogTab === "tools") {
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
      card.querySelector("pre").textContent = JSON.stringify(fn.parameters, null, 2);
    } else {
      card.innerHTML = `
        <div class="capability-head">
          <div><span>skill</span><h3>${item.name}</h3></div>
          <b class="planned">${item.status}</b>
        </div>
        <p>${item.description}</p>`;
    }

    list.append(card);
  });
};

const loadCapabilities = async () => {
  const response = await fetch("/api/capabilities");
  if (!response.ok) throw new Error("Не вдалося завантажити capabilities");
  capabilities = await response.json();
  renderCapabilities();
};

document.querySelector("#addMessage").addEventListener("click", () => addMessage());
document.querySelector("#openPromptBuilder").addEventListener("click", () => {
  updatePromptPreview();
  builder.dialog.showModal();
});
document.querySelector("#insertPrompt").addEventListener("click", () => {
  const prompt = buildPrompt();
  setMessages([
    { role: "system", content: prompt.system },
    { role: "user", content: prompt.user }
  ]);
});
document.querySelector("#openCapabilities").addEventListener("click", async () => {
  document.querySelector("#capabilitiesDialog").showModal();
  if (capabilities.tools.length === 0) await loadCapabilities();
});
document.querySelector("#closeCapabilities").addEventListener("click", () => {
  document.querySelector("#capabilitiesDialog").close();
});
document.querySelectorAll("[data-catalog-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    activeCatalogTab = button.dataset.catalogTab;
    document.querySelectorAll("[data-catalog-tab]").forEach((tab) => {
      tab.classList.toggle("active", tab === button);
    });
    renderCapabilities();
  });
});
Object.values(builder).filter((item) => item instanceof HTMLElement).forEach((element) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)) {
    element.addEventListener("input", updatePromptPreview);
  }
});
elements.send.addEventListener("click", () => run([Number(elements.temperature.value)]));
elements.compare.addEventListener("click", () => run([0, 0.7, 1]));
elements.mode.addEventListener("change", updateMode);
elements.temperature.addEventListener("input", () => {
  document.querySelector("#temperatureValue").value = elements.temperature.value;
});
elements.maxTokens.addEventListener("input", () => {
  document.querySelector("#maxTokensValue").value = elements.maxTokens.value;
});
document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => setMessages(presets[button.dataset.preset]));
});

setMessages(presets.system);
updateMode();
loadModels();
