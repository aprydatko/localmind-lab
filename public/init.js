/**
 * Application Initialization
 * Handles startup logic and initial state setup
 */

import { loadModels } from "./api.js";
import { presets } from "./presets.js";
import { elements } from "./state.js";
import { setMessages } from "./ui.js";

/**
 * Initializes the application by loading available models and setting up the UI
 * @async
 */
export const initializeApplication = async () => {
  // Set initial UI state
  setMessages(elements.messages, presets.system);

  // Load and display available models
  try {
    const { models, offline } = await loadModels();
    const modelsElement = document.querySelector("#models");
    modelsElement.replaceChildren(
      ...models.map(({ id }) => {
        const option = document.createElement("option");
        option.value = id;
        return option;
      }),
    );
    if (models[0]) elements.model.value = models[0].id;

    const status = document.querySelector("#connection");
    status.innerHTML = `<span></span> ${offline ? "UI server ready" : "llama.cpp online"}`;
    status.classList.toggle("offline", offline);
  } catch (error) {
    console.error("Failed to load models:", error);
    const status = document.querySelector("#connection");
    status.innerHTML = "<span></span> unavailable";
    status.classList.add("offline");
  }
};
