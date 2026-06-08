/**
 * Application State Management
 * Centralized state for the application
 */

/**
 * @typedef {Object} Capability
 * @property {'mode'|'skill'} type - Type of capability
 * @property {string} name - Name of the capability
 * @property {string} [mode] - Mode associated with the capability
 * @property {string} [details] - Additional details about the capability
 */

/**
 * @typedef {Object} Capabilities
 * @property {Array} tools - Available tools
 * @property {Array} skills - Available skills
 */

/**
 * @typedef {Object} AppState
 * @property {Capability|null} activeCapability - Currently active capability
 * @property {Capabilities} currentCapabilities - Current capabilities data
 */

/** @type {AppState} */
let appState = {
  activeCapability: null,
  currentCapabilities: { tools: [], skills: [] },
};

/**
 * Gets the current application state
 * @returns {AppState} The current application state
 */
export const getAppState = () => appState;

/**
 * Sets the active capability
 * @param {Capability} capability - The capability to set as active
 */
export const setActiveCapability = (capability) => {
  appState.activeCapability = capability;
};

/**
 * Gets the currently active capability
 * @returns {Capability|null} The active capability or null
 */
export const getActiveCapability = () => appState.activeCapability;

/**
 * Sets the current capabilities
 * @param {Capabilities} capabilities - The capabilities to set
 */
export const setCurrentCapabilities = (capabilities) => {
  appState.currentCapabilities = capabilities;
};

/**
 * Gets the current capabilities
 * @returns {Capabilities} The current capabilities
 */
export const getCurrentCapabilities = () => appState.currentCapabilities;
