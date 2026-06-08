/**
 * Request Runner
 * Handles API request execution for different modes
 */

import {
  buildRequestBody,
  getEndpointForMode,
  requestCompletion,
  streamCompletion,
} from "../api.js";
import { renderMarkdown } from "../markdown.js";
import { elements } from "../state.js";
import { resultCard as createResultCard } from "../ui.js";
import { getMessages, normalizedResult } from "../utils.js";
import { showLoadingState, hideLoadingState } from "./loading-manager.js";

/**
 * Runs model requests for specified temperatures
 * Handles both streaming and standard request modes
 * @param {Array<number>} temperatures - Array of temperature values to test
 * @async
 */
export const run = async (temperatures) => {
  elements.error.hidden = true;
  elements.results.replaceChildren();
  elements.send.disabled = true;
  elements.compare.disabled = true;
  showLoadingState();

  try {
    if (elements.mode.value === "stream") {
      await runStreamRequests(temperatures);
      return;
    }

    await runStandardRequests(temperatures);
  } catch (error) {
    elements.error.textContent = error.message;
    elements.error.hidden = false;
  } finally {
    elements.send.disabled = false;
    elements.compare.disabled = elements.mode.value !== "chat";
    hideLoadingState();
  }
};

/**
 * Runs streaming requests for specified temperatures
 * @param {Array<number>} temperatures - Array of temperature values to test
 * @async
 */
const runStreamRequests = async (temperatures) => {
  for (const temperature of temperatures) {
    const card = createResultCard({}, temperature, elements.mode.value, true);
    elements.results.append(card);

    const requestBody = buildRequestBody(
      getMessages(elements.messages),
      elements.model.value,
      temperature,
      Number(elements.maxTokens.value),
    );

    let thinkingBlock = null;
    const onReasoningChunk = (reasoning) => {
      if (!thinkingBlock && reasoning) {
        thinkingBlock = document.createElement("div");
        thinkingBlock.className = "thinking-block";
        thinkingBlock.innerHTML = `
          <details open>
            <summary>💭 Thinking Process</summary>
            <pre></pre>
          </details>`;
        card.insertBefore(thinkingBlock, card.querySelector(".answer"));
      }
      if (thinkingBlock) {
        thinkingBlock.querySelector("pre").textContent = reasoning;
      }
    };

    const onContentChunk = (content) => {
      const output = card.querySelector(".answer");
      renderMarkdown(output, content);
    };

    const tokenUsageSection = card.querySelector(".token-usage");
    const updateUsage = (usage) => {
      if (!tokenUsageSection) return;
      const strongs = [...tokenUsageSection.querySelectorAll("strong")];
      if (strongs.length < 3) return;
      strongs[0].textContent = usage.prompt_tokens ?? "—";
      strongs[1].textContent = usage.completion_tokens ?? "—";
      strongs[2].textContent = usage.total_tokens ?? "—";
    };

    const streamResult = await streamCompletion(
      requestBody,
      onContentChunk,
      onReasoningChunk,
      updateUsage,
    );

    if (streamResult.usage) {
      updateUsage(streamResult.usage);
    }

    if (
      streamResult.finishReason &&
      streamResult.finishReason !== "streaming"
    ) {
      const finishLabel = card.querySelector(".result-head span");
      if (finishLabel) finishLabel.textContent = streamResult.finishReason;
    }

    if (thinkingBlock) {
      thinkingBlock.querySelector("details").open = false;
    }
  }
};

/**
 * Runs standard (non-streaming) requests for specified temperatures
 * @param {Array<number>} temperatures - Array of temperature values to test
 * @async
 */
const runStandardRequests = async (temperatures) => {
  const results = await Promise.all(
    temperatures.map(async (temperature) => {
      const requestBody = buildRequestBody(
        getMessages(elements.messages),
        elements.model.value,
        temperature,
        Number(elements.maxTokens.value),
      );
      const endpoint = getEndpointForMode(elements.mode.value);
      const data = await requestCompletion(requestBody, endpoint);
      const result = normalizedResult(data, elements.mode.value);
      return { temperature, result };
    }),
  );

  results.forEach(({ temperature, result }) => {
    const card = createResultCard(result, temperature, elements.mode.value);
    elements.results.append(card);
  });
};
