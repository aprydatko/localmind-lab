import { buildChatRequest } from "../chat-request.js";
import { runStructuredAnalysis } from "../structured-output.js";
import { sendApiError } from "../utils/api-error.js";

export const buildProxyChat = (client, fallbackModel) => async (req, res) => {
  try {
    const input = req.body;
    const result = await client.chat(buildChatRequest(input, fallbackModel));
    res.json(result);
  } catch (error) {
    sendApiError(res, error);
  }
};

export const buildStructuredChat = (client, fallbackModel) => async (req, res) => {
  try {
    const input = req.body;
    const result = await runStructuredAnalysis({
      client,
      request: buildChatRequest(input, fallbackModel),
    });
    res.json(result);
  } catch (error) {
    sendApiError(res, error);
  }
};

export const buildStreamChat = (client, fallbackModel) => async (req, res) => {
  try {
    const input = req.body;
    const upstream = await client.request("/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify(
        buildChatRequest(input, fallbackModel, { stream: true }),
      ),
    });

    if (!upstream.ok || !upstream.body) {
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }

    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });

    for await (const chunk of upstream.body) res.write(chunk);
    res.end();
  } catch (error) {
    if (!res.headersSent) return sendApiError(res, error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
};
