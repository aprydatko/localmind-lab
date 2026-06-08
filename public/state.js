/**
 * Application State Management
 * Centralized state for capabilities, UI elements, and user preferences
 */

export const elements = {
  messages: document.querySelector('#messages'),
  results: document.querySelector('#results'),
  error: document.querySelector('#error'),
  send: document.querySelector('#send'),
  compare: document.querySelector('#compare'),
  model: document.querySelector('#model'),
  mode: document.querySelector('#mode'),
  modeHelp: document.querySelector('#modeHelp'),
  uploadBtn: document.querySelector('#uploadBtn'),
  fileUpload: document.querySelector('#fileUpload'),
  uploadStatus: document.querySelector('#uploadStatus'),
  uploadedFiles: document.querySelector('#uploadedFiles'),
  activeCapability: document.querySelector('#activeCapabilities'),
  temperature: document.querySelector('#temperature'),
  maxTokens: document.querySelector('#maxTokens'),
};

export const builder = {
  dialog: document.querySelector('#promptBuilder'),
  role: document.querySelector('#builderRole'),
  language: document.querySelector('#builderLanguage'),
  task: document.querySelector('#builderTask'),
  context: document.querySelector('#builderContext'),
  constraints: document.querySelector('#builderConstraints'),
  format: document.querySelector('#builderFormat'),
  technique: document.querySelector('#builderTechnique'),
  preview: document.querySelector('#promptPreview'),
};

// Global app state
export let capabilities = { tools: [], skills: [] };
export let activeCatalogTab = 'tools';
export let activeCapability = null;

// Setters for state mutations
export const setState = {
  setCapabilities(value) {
    capabilities = value;
  },
  setActiveCatalogTab(value) {
    activeCatalogTab = value;
  },
  setActiveCapability(value) {
    activeCapability = value;
  },
};
