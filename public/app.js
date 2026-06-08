/**
 * Local LLM Lab - Main Application Entry Point
 * Orchestrates all modules and initializes the app
 */

import { initializeApplication as initializeModels } from "./init.js";
import { presets } from "./presets.js";
import { elements } from "./state.js";
import { setMessages } from "./ui.js";
import {
  handleLoadCapabilities,
  renderCapabilitiesList,
  run,
  setupLanguageSync,
  updateMode,
} from "./orchestrator.js";
import {
  setupCapabilitiesHandlers,
  setupFileUploadHandlers,
  setupMainActionHandlers,
  setupMessageHandlers,
  setupModeChangeHandler,
  setupParameterHandlers,
  setupPresetButtons,
  setupPromptBuilderHandlers,
} from "./handlers.js";
import { buildPrompt as buildPromptFn } from "./utils.js";
import { builder } from "./state.js";

// ============================================================================
// Event Handlers Setup
// ============================================================================

const setupAllHandlers = () => {
  // Prompt Builder
  setupPromptBuilderHandlers(buildPromptFn);

  // Language sync
  setupLanguageSync();

  // Messages
  setupMessageHandlers();

  // Capabilities Dialog
  setupCapabilitiesHandlers(renderCapabilitiesList, handleLoadCapabilities);

  // File Upload
  setupFileUploadHandlers();

  // Presets
  setupPresetButtons();

  // Mode and Parameters
  setupModeChangeHandler(updateMode);
  setupParameterHandlers();

  // Main Actions
  setupMainActionHandlers(run, run);
};

// ============================================================================
// Initialization
// ============================================================================

const initializeApplication = async () => {
  // Set initial UI state
  setMessages(elements.messages, presets.system);
  updateMode();

  // Load and display available models
  await initializeModels();

  setupAllHandlers();
};

// Start the application
initializeApplication();
