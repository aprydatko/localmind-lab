/**
 * Loading Manager
 * Manages loading state for the application
 */

import { elements } from "../state.js";

/**
 * Shows the loading state in the UI
 * Displays a spinner and "Waiting..." text on the send button
 */
export const showLoadingState = () => {
  const spinner = document.createElement("span");
  spinner.className = "loading-spinner";
  elements.send.innerHTML = "";
  elements.send.appendChild(spinner);
  elements.send.appendChild(document.createTextNode("  Waiting..."));
};

/**
 * Hides the loading state in the UI
 * Restores the send button to its normal state
 */
export const hideLoadingState = () => {
  elements.send.innerHTML = "Run model <span>↗</span>";
};
