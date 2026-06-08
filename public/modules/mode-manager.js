/**
 * Mode Manager
 * Handles mode switching and mode-related UI updates
 */

import { modeHelp, presets } from "../presets.js";
import { elements } from "../state.js";
import { setMessages } from "../ui.js";
import { renderActiveCapability } from "../ui.js";
import { getActiveCapability, setActiveCapability } from "./app-state.js";

/**
 * Updates the application mode and related UI elements
 * Updates mode help text, compare button state, upload button visibility,
 * and sets appropriate preset messages for the selected mode
 */
export const updateMode = () => {
  elements.modeHelp.textContent = modeHelp[elements.mode.value];
  elements.compare.disabled = elements.mode.value !== "chat";

  if (elements.mode.value === "rag") {
    elements.uploadBtn.style.display = "inline-block";
  } else {
    elements.uploadBtn.style.display = "none";
    elements.uploadStatus.textContent = "";
  }

  if (elements.mode.value === "structured")
    setMessages(elements.messages, presets.document);
  if (elements.mode.value === "banking")
    setMessages(elements.messages, presets.banking);
  if (elements.mode.value === "rag")
    setMessages(elements.messages, presets.rag);

  setActiveModeIndicator();
};

/**
 * Sets the active mode indicator in the UI
 * Displays the currently active capability or mode
 */
const setActiveModeIndicator = () => {
  const activeCapability = getActiveCapability();

  if (
    activeCapability?.type === "skill" &&
    activeCapability.mode === elements.mode.value
  ) {
    renderActiveCapability(elements, activeCapability);
    return;
  }

  const newCapability = {
    type: "mode",
    name:
      elements.mode.value === "banking"
        ? "banking agent tools"
        : elements.mode.value,
  };
  setActiveCapability(newCapability);
  renderActiveCapability(elements, newCapability);
};

/**
 * Applies the response language to the system message in the conversation
 * @param {string} language - The language to set (e.g., "English", "Ukrainian")
 */
export const applyResponseLanguageToConversation = (language) => {
  const systemMessage = [
    ...elements.messages.querySelectorAll(".message"),
  ].find((message) => message.querySelector("select").value === "system");

  if (!systemMessage) return;

  const textarea = systemMessage.querySelector("textarea");
  const currentValue = textarea.value || "";
  const languagePhrase = `Respond in ${language}.`;

  if (/Respond in [^.]+\./.test(currentValue)) {
    textarea.value = currentValue.replace(/Respond in [^.]+\./, languagePhrase);
  } else {
    textarea.value = `${currentValue.trim()}

${languagePhrase}`.trim();
  }
};
