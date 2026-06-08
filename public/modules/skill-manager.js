/**
 * Skill Manager
 * Handles skill activation and capabilities management
 */

import { loadCapabilities } from "../api.js";
import { presets } from "../presets.js";
import { elements } from "../state.js";
import {
  renderCapabilities,
  renderActiveCapability,
  setMessages,
} from "../ui.js";
import {
  setActiveCapability,
  getCurrentCapabilities,
  setCurrentCapabilities,
} from "./app-state.js";
import { updateMode } from "./mode-manager.js";

/**
 * Activates a skill and updates the application state accordingly
 * @param {Object} skill - The skill to activate
 * @param {string} skill.name - Name of the skill
 * @param {string} [skill.mode] - Mode associated with the skill
 * @param {string} [skill.preset] - Preset to use for the skill
 * @param {Array} [skill.messages] - Messages to use for the skill
 */
export const activateSkill = (skill) => {
  const newCapability = {
    type: "skill",
    name: skill.name,
    mode: skill.mode || "chat",
    details:
      skill.mode === "banking"
        ? "uses banking tools"
        : skill.mode === "rag"
          ? "uses RAG search"
          : skill.mode === "structured"
            ? "uses structured output flow"
            : "uses chat workflow",
  };

  setActiveCapability(newCapability);

  elements.mode.value = newCapability.mode;
  updateMode();

  if (skill.preset && presets[skill.preset]) {
    setMessages(elements.messages, presets[skill.preset]);
  } else if (skill.messages) {
    setMessages(elements.messages, skill.messages);
  }

  renderActiveCapability(elements, newCapability);
  document.querySelector("#capabilitiesDialog").close();
};

/**
 * Renders the capabilities list in the UI
 * Displays either tools or skills based on the active catalog tab
 */
export const renderCapabilitiesList = () => {
  const list = document.querySelector("#capabilityList");
  let activeCatalogTab = "tools";
  const tabs = document.querySelectorAll("[data-catalog-tab]");
  tabs.forEach((tab) => {
    if (tab.classList.contains("active")) {
      activeCatalogTab = tab.dataset.catalogTab;
    }
  });
  renderCapabilities(
    list,
    getCurrentCapabilities(),
    activeCatalogTab,
    activateSkill,
  );
};

/**
 * Loads capabilities from the API and updates the application state
 * @async
 */
export const handleLoadCapabilities = async () => {
  try {
    const loaded = await loadCapabilities();
    setCurrentCapabilities(loaded);
    renderCapabilitiesList();
  } catch (error) {
    console.error("Failed to load capabilities:", error);
  }
};
