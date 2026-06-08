/**
 * Local LLM Lab - Main Application Entry Point
 * Orchestrates all modules and initializes the app
 */

import {
  buildRequestBody,
  getEndpointForMode,
  loadCapabilities,
  loadModels,
  requestCompletion,
  streamCompletion,
} from './api.js';
import { renderMarkdown } from './markdown.js';
import { modeHelp, presets } from './presets.js';
import { builder, elements } from './state.js';
import {
  addMessage,
  resultCard as createResultCard,
  renderActiveCapability,
  renderCapabilities,
  setMessages,
  updatePromptPreview as updateBuilderPreview,
} from './ui.js';
import {
  buildPrompt as buildPromptFn,
  getMessages,
  normalizedResult
} from './utils.js';

// ============================================================================
// Global App State (for managing capability and mode)
// ============================================================================

let appState = {
  activeCapability: null,
};

const updateMode = () => {
  elements.modeHelp.textContent = modeHelp[elements.mode.value];
  elements.compare.disabled = elements.mode.value !== 'chat';

  if (elements.mode.value === 'rag') {
    elements.uploadBtn.style.display = 'inline-block';
  } else {
    elements.uploadBtn.style.display = 'none';
    elements.uploadStatus.textContent = '';
  }

  if (elements.mode.value === 'structured')
    setMessages(elements.messages, presets.document);
  if (elements.mode.value === 'banking')
    setMessages(elements.messages, presets.banking);
  if (elements.mode.value === 'rag')
    setMessages(elements.messages, presets.rag);

  setActiveModeIndicator();
};

const setActiveModeIndicator = () => {
  if (
    appState.activeCapability?.type === 'skill' &&
    appState.activeCapability.mode === elements.mode.value
  ) {
    renderActiveCapability(elements, appState.activeCapability);
    return;
  }

  appState.activeCapability = {
    type: 'mode',
    name:
      elements.mode.value === 'banking'
        ? 'banking agent tools'
        : elements.mode.value,
  };
  renderActiveCapability(elements, appState.activeCapability);
};

const activateSkill = (skill) => {
  appState.activeCapability = {
    type: 'skill',
    name: skill.name,
    mode: skill.mode || 'chat',
    details:
      skill.mode === 'banking'
        ? 'uses banking tools'
        : skill.mode === 'rag'
          ? 'uses RAG search'
          : skill.mode === 'structured'
            ? 'uses structured output flow'
            : 'uses chat workflow',
  };

  elements.mode.value = appState.activeCapability.mode;
  updateMode();

  if (skill.preset && presets[skill.preset]) {
    setMessages(elements.messages, presets[skill.preset]);
  } else if (skill.messages) {
    setMessages(elements.messages, skill.messages);
  }

  renderActiveCapability(elements, appState.activeCapability);
  document.querySelector('#capabilitiesDialog').close();
};

let currentCapabilities = { tools: [], skills: [] };

const renderCapabilitiesList = () => {
  const list = document.querySelector('#capabilityList');
  let activeCatalogTab = 'tools';
  const tabs = document.querySelectorAll('[data-catalog-tab]');
  tabs.forEach((tab) => {
    if (tab.classList.contains('active')) {
      activeCatalogTab = tab.dataset.catalogTab;
    }
  });
  renderCapabilities(
    list,
    currentCapabilities,
    activeCatalogTab,
    activateSkill
  );
};

const handleLoadCapabilities = async () => {
  try {
    const loaded = await loadCapabilities();
    currentCapabilities = loaded;
    renderCapabilitiesList();
  } catch (error) {
    console.error('Failed to load capabilities:', error);
  }
};

const run = async (temperatures) => {
  elements.error.hidden = true;
  elements.results.replaceChildren();
  elements.send.disabled = true;
  elements.compare.disabled = true;

  try {
    if (elements.mode.value === 'stream') {
      for (const temperature of temperatures) {
        const card = createResultCard(
          {},
          temperature,
          elements.mode.value,
          true
        );
        const output = card.querySelector('.answer');
        elements.results.append(card);

        const requestBody = buildRequestBody(
          getMessages(elements.messages),
          elements.model.value,
          temperature,
          Number(elements.maxTokens.value)
        );

        await streamCompletion(requestBody, (content) => {
          renderMarkdown(output, content);
        });
      }
      return;
    }

    const results = await Promise.all(
      temperatures.map(async (temperature) => {
        const requestBody = buildRequestBody(
          getMessages(elements.messages),
          elements.model.value,
          temperature,
          Number(elements.maxTokens.value)
        );
        const endpoint = getEndpointForMode(elements.mode.value);
        const data = await requestCompletion(requestBody, endpoint);
        const result = normalizedResult(data, elements.mode.value);
        return { temperature, result };
      })
    );

    results.forEach(({ temperature, result }) => {
      const card = createResultCard(result, temperature, elements.mode.value);
      elements.results.append(card);
    });
  } catch (error) {
    elements.error.textContent = error.message;
    elements.error.hidden = false;
  } finally {
    elements.send.disabled = false;
    elements.compare.disabled = elements.mode.value !== 'chat';
  }
};

// ============================================================================
// Event Handlers Setup
// ============================================================================

const setupAllHandlers = () => {
  // Prompt Builder
  document.querySelector('#openPromptBuilder').addEventListener('click', () => {
    updateBuilderPreview(builder, buildPromptFn);
    builder.dialog.showModal();
  });

  document.querySelector('#insertPrompt').addEventListener('click', () => {
    const builderElements = {
      role: builder.role,
      language: builder.language,
      task: builder.task,
      context: builder.context,
      constraints: builder.constraints,
      format: builder.format,
      technique: builder.technique,
    };
    const prompt = buildPromptFn(builderElements);
    setMessages(elements.messages, [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ]);
  });

  Object.values(builder)
    .filter((item) => item instanceof HTMLElement)
    .forEach((element) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) {
        element.addEventListener('input', () =>
          updateBuilderPreview(builder, buildPromptFn)
        );
      }
    });

  // Messages
  document.querySelector('#addMessage').addEventListener('click', () => {
    addMessage(elements.messages);
  });

  // Capabilities Dialog
  document
    .querySelector('#openCapabilities')
    .addEventListener('click', async () => {
      document.querySelector('#capabilitiesDialog').showModal();
      if (currentCapabilities.tools.length === 0) {
        await handleLoadCapabilities();
      }
    });

  document.querySelector('#closeCapabilities').addEventListener('click', () => {
    document.querySelector('#capabilitiesDialog').close();
  });

  document.querySelectorAll('[data-catalog-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-catalog-tab]').forEach((tab) => {
        tab.classList.remove('active');
      });
      button.classList.add('active');
      renderCapabilitiesList();
    });
  });

  // File Upload
  elements.uploadBtn.addEventListener('click', () => {
    elements.fileUpload.click();
  });

  elements.fileUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    elements.uploadStatus.textContent = 'Uploading...';
    elements.uploadStatus.style.color = '#888';

    try {
      const { uploadFile, getUploadedFiles, renderUploadedFiles } =
        await import('./api.js');
      const { renderUploadedFiles: renderUI } = await import('./ui.js');

      const result = await (await import('./api.js')).uploadFile(file);

      if (result.originalname) {
        elements.uploadStatus.textContent = `✔ ${result.originalname} uploaded and indexed!`;
        elements.uploadStatus.style.color = '#4CAF50';
        const uploads = await (await import('./api.js')).getUploadedFiles();
        renderUI(elements.uploadedFiles, uploads.files || []);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      elements.uploadStatus.textContent = `✖ Upload failed: ${err.message}`;
      elements.uploadStatus.style.color = '#f44336';
    }

    elements.fileUpload.value = '';
  });

  // Presets
  document.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      const preset = presets[button.dataset.preset];
      if (preset) {
        setMessages(elements.messages, preset);
      }
    });
  });

  // Mode and Parameters
  elements.mode.addEventListener('change', updateMode);

  elements.temperature.addEventListener('input', () => {
    document.querySelector('#temperatureValue').value =
      elements.temperature.value;
  });

  elements.maxTokens.addEventListener('input', () => {
    document.querySelector('#maxTokensValue').value = elements.maxTokens.value;
  });

  // Main Actions
  elements.send.addEventListener('click', () =>
    run([Number(elements.temperature.value)])
  );

  elements.compare.addEventListener('click', () => run([0, 0.7, 1]));
};

// ============================================================================
// Initialization
// ============================================================================

const initializeApplication = async () => {
  // Set initial UI state
  setMessages(elements.messages, presets.system);
  updateMode();

  // Load and display available models
  try {
    const { models, offline } = await loadModels();
    const modelsElement = document.querySelector('#models');
    modelsElement.replaceChildren(
      ...models.map(({ id }) => {
        const option = document.createElement('option');
        option.value = id;
        return option;
      })
    );
    if (models[0]) elements.model.value = models[0].id;

    const status = document.querySelector('#connection');
    status.innerHTML = `<span></span> ${offline ? 'сервер UI готовий' : 'llama.cpp online'}`;
    status.classList.toggle('offline', offline);
  } catch (error) {
    console.error('Failed to load models:', error);
    const status = document.querySelector('#connection');
    status.innerHTML = '<span></span> недоступно';
    status.classList.add('offline');
  }

  setupAllHandlers();
};

// Start the application
initializeApplication();
