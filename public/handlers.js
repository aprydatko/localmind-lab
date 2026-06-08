/**
 * Event Handlers
 * Centralized event listener setup
 */

import {
  deleteUploadedFile,
  getUploadedFiles,
  loadCapabilities,
  uploadFile,
} from './api.js';
import { presets } from './presets.js';
import { builder, elements, setState } from './state.js';
import {
  renderUploadedFiles,
  setMessages,
  updatePromptPreview
} from './ui.js';

export const setupPromptBuilderHandlers = (buildPromptFn) => {
  document.querySelector('#openPromptBuilder').addEventListener('click', () => {
    updatePromptPreview(builder, buildPromptFn);
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
          updatePromptPreview(builder, buildPromptFn)
        );
      }
    });
};

export const setupCapabilitiesHandlers = (
  onSkillActivate,
  onCatalogTabChange
) => {
  document
    .querySelector('#openCapabilities')
    .addEventListener('click', async () => {
      document.querySelector('#capabilitiesDialog').showModal();
      const capabilities = elements.activeCapability?.closest(
        '[data-capabilities]'
      )?.data || { tools: [], skills: [] };
      if (capabilities.tools?.length === 0) {
        try {
          const loaded = await loadCapabilities();
          setState.setCapabilities(loaded);
        } catch (error) {
          console.error('Failed to load capabilities:', error);
        }
      }
    });

  document.querySelector('#closeCapabilities').addEventListener('click', () => {
    document.querySelector('#capabilitiesDialog').close();
  });

  document.querySelectorAll('[data-catalog-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      setState.setActiveCatalogTab(button.dataset.catalogTab);
      document.querySelectorAll('[data-catalog-tab]').forEach((tab) => {
        tab.classList.toggle('active', tab === button);
      });
      onCatalogTabChange();
    });
  });
};

export const setupFileUploadHandlers = async () => {
  elements.uploadBtn.addEventListener('click', () => {
    elements.fileUpload.click();
  });

  elements.fileUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    elements.uploadStatus.textContent = 'Uploading...';
    elements.uploadStatus.style.color = '#888';

    try {
      const result = await uploadFile(file);

      if (result.originalname) {
        elements.uploadStatus.textContent = `✔ ${result.originalname} uploaded and indexed!`;
        elements.uploadStatus.style.color = '#4CAF50';
        const uploads = await getUploadedFiles();
        renderUploadedFiles(elements.uploadedFiles, uploads.files || []);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      elements.uploadStatus.textContent = `✖ Upload failed: ${err.message}`;
      elements.uploadStatus.style.color = '#f44336';
    }

    elements.fileUpload.value = '';
  });

  elements.uploadedFiles.addEventListener('deleteFile', async (e) => {
    const { filename } = e.detail;
    if (!confirm(`Видалити файл "${filename}"?`)) return;

    try {
      const result = await deleteUploadedFile(filename);
      if (result.error) throw new Error(result.error);

      elements.uploadStatus.textContent = `✔ ${filename} видалено.`;
      elements.uploadStatus.style.color = '#4CAF50';
      const uploads = await getUploadedFiles();
      renderUploadedFiles(elements.uploadedFiles, uploads.files || []);
    } catch (error) {
      elements.uploadStatus.textContent = `✖ Видалити не вдалося: ${error.message}`;
      elements.uploadStatus.style.color = '#f44336';
    }
  });
};

export const setupMessageHandlers = () => {
  document.querySelector('#addMessage').addEventListener('click', () => {
    const { addMessage: add } = require('./ui.js');
    add(elements.messages);
  });
};

export const setupPresetButtons = () => {
  document.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      const preset = presets[button.dataset.preset];
      if (preset) {
        setMessages(elements.messages, preset);
      }
    });
  });
};

export const setupModeChangeHandler = (onModeChange) => {
  elements.mode.addEventListener('change', onModeChange);
};

export const setupParameterHandlers = () => {
  elements.temperature.addEventListener('input', () => {
    document.querySelector('#temperatureValue').value =
      elements.temperature.value;
  });

  elements.maxTokens.addEventListener('input', () => {
    document.querySelector('#maxTokensValue').value = elements.maxTokens.value;
  });
};

export const setupMainActionHandlers = (onSend, onCompare) => {
  elements.send.addEventListener('click', () => {
    onSend([Number(elements.temperature.value)]);
  });

  elements.compare.addEventListener('click', () => {
    onCompare([0, 0.7, 1]);
  });
};
