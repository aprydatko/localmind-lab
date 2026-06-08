import { buildChatRequest } from "../chat-request.js";
import { client, fallbackModel } from "../llama-client.js";

export const buildRagChat = (ragService) => async (req, res) => {
  try {
    const input = req.body;

    // Assume the last user message contains the question
    const userMessages = input.messages.filter((m) => m.role === "user");
    const lastUserMessage = userMessages[userMessages.length - 1];
    const query = lastUserMessage ? lastUserMessage.content : "";

    let contextText = "";
    let sources = [];
    let searchResults = [];
    if (query) {
      searchResults = await ragService.search(query, 3);
      console.log(
        "[rag] query:",
        query,
        "searchResults:",
        searchResults.length,
        "sources:",
        [...new Set(searchResults.map((r) => r.source))],
      );
      if (searchResults.length > 0) {
        contextText = searchResults
          .map(
            (r, i) =>
              `--- Chunk ${i + 1} (Source: ${r.source}) ---\n${r.content}`,
          )
          .join("\n\n");
        sources = [...new Set(searchResults.map((r) => r.source))];
      }
    }

    const systemPrompt = `You are a knowledgeable assistant. Use the following pieces of retrieved context to answer the user's question.
If you don't know the answer based on the context, just say that you don't know, don't try to make up an answer.

<context>
${contextText || "No relevant context found."}
</context>`;

    const chatRequest = buildChatRequest(input, fallbackModel);

    // Prepend our system prompt, remove any existing system prompts from the client to enforce RAG
    chatRequest.messages = [
      { role: "system", content: systemPrompt },
      ...chatRequest.messages.filter((m) => m.role !== "system"),
    ];

    const result = await client.chat(chatRequest);

    // We can inject sources into the result for the frontend to display
    if (result.choices && result.choices[0] && sources.length > 0) {
      result.sources = sources;
      result.ragChunks = searchResults;
    }

    res.json(result);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
};
