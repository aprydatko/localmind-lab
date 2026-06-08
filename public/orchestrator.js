/**
 * Application Orchestrator
 * Coordinates between different modules and manages app-level logic
 */

import { builder, elements } from "./state.js";
import { updatePromptPreview } from "./ui.js";
import { buildPrompt as buildPromptFn } from "./utils.js";
import {
  updateMode,
  applyResponseLanguageToConversation,
} from "./modules/mode-manager.js";
import {
  activateSkill,
  renderCapabilitiesList,
  handleLoadCapabilities,
} from "./modules/skill-manager.js";
import { run } from "./modules/request-runner.js";

// Re-export functions from modules for convenience
export {
  updateMode,
  activateSkill,
  renderCapabilitiesList,
  handleLoadCapabilities,
  run,
};

// Language sync
/**
 * Sets up language synchronization between UI language selector and prompt builder
 * Ensures that changes to either element are reflected in the other
 */
export const setupLanguageSync = () => {
  elements.uiLanguage.addEventListener("change", () => {
    builder.language.value = elements.uiLanguage.value;
    updatePromptPreview(builder, buildPromptFn);
    applyResponseLanguageToConversation(elements.uiLanguage.value);
  });

  builder.language.addEventListener("change", () => {
    elements.uiLanguage.value = builder.language.value;
    applyResponseLanguageToConversation(builder.language.value);
  });
};
