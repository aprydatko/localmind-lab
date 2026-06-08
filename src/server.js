import "dotenv/config";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { runBankingAgent } from "./banking-agent.js";
import { capabilityCatalog } from "./capabilities.js";
import { buildChatRequest } from "./chat-request.js";
import { LlamaClient } from "./llama-client.js";
import { runStructuredAnalysis } from "./structured-output.js";

const root = fileURLToPath(new URL("../public", import.meta.url));
const vendorFiles = new Map([
  ["/vendor/marked.js", fileURLToPath(new URL("../node_modules/marked/lib/marked.esm.js", import.meta.url))],
  ["/vendor/dompurify.js", fileURLToPath(new URL("../node_modules/dompurify/dist/purify.es.mjs", import.meta.url))]
]);
const port = Number(process.env.PORT || 3000);
const fallbackModel = process.env.LLAMA_MODEL || "";
const client = new LlamaClient({
  baseUrl: process.env.LLAMA_BASE_URL || "http://127.0.0.1:8080",
  apiKey: process.env.LLAMA_API_KEY,
  timeoutMs: Number(process.env.LLAMA_TIMEOUT_MS || 120_000)
});

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

const sendJson = (response, status, body) => {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
};

const readJson = async (request) => {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error("Request body is too large");
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const handleJsonRoute = async (request, response, handler) => {
  try {
    return sendJson(response, 200, await handler(await readJson(request)));
  } catch (error) {
    const status = error instanceof SyntaxError ? 400 : 502;
    return sendJson(response, status, { error: error.message });
  }
};

const proxyChat = (request, response) => handleJsonRoute(request, response, async (input) => {
  return client.chat(buildChatRequest(input, fallbackModel));
});

const structuredChat = (request, response) => handleJsonRoute(request, response, async (input) => {
  return runStructuredAnalysis({
    client,
    request: buildChatRequest(input, fallbackModel)
  });
});

const bankingChat = (request, response) => handleJsonRoute(request, response, async (input) => {
  const chatRequest = buildChatRequest(input, fallbackModel);
  chatRequest.messages = [
    {
      role: "system",
      content: "You are a safe mock banking assistant. Use tools for account data. Never invent balances, transactions, or rates. Clearly say that all data is simulated."
    },
    ...chatRequest.messages.filter((message) => message.role !== "system")
  ];
  return runBankingAgent({ client, request: chatRequest });
});

const streamChat = async (request, response) => {
  try {
    const input = await readJson(request);
    const upstream = await client.request("/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify(buildChatRequest(input, fallbackModel, { stream: true }))
    });

    if (!upstream.ok || !upstream.body) {
      return sendJson(response, upstream.status, await upstream.json());
    }

    response.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive"
    });

    for await (const chunk of upstream.body) response.write(chunk);
    return response.end();
  } catch (error) {
    if (!response.headersSent) return sendJson(response, 502, { error: error.message });
    response.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    return response.end();
  }
};

const proxyModels = async (response) => {
  try {
    const upstream = await client.request("/v1/models");
    return sendJson(response, upstream.status, await upstream.json());
  } catch {
    return sendJson(response, 200, {
      data: fallbackModel ? [{ id: fallbackModel }] : [],
      offline: true
    });
  }
};

const serveStatic = (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const vendorPath = vendorFiles.get(pathname);

  if (vendorPath) {
    response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
    return createReadStream(vendorPath).pipe(response);
  }

  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = normalize(join(root, requested));

  if (!filePath.startsWith(root) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    return sendJson(response, 404, { error: "Not found" });
  }

  response.writeHead(200, {
    "content-type": contentTypes[extname(filePath)] || "application/octet-stream"
  });
  return createReadStream(filePath).pipe(response);
};

createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/api/chat") return proxyChat(request, response);
  if (request.method === "POST" && request.url === "/api/chat/stream") return streamChat(request, response);
  if (request.method === "POST" && request.url === "/api/structured") return structuredChat(request, response);
  if (request.method === "POST" && request.url === "/api/banking-agent") return bankingChat(request, response);
  if (request.method === "GET" && request.url === "/api/capabilities") {
    return sendJson(response, 200, capabilityCatalog);
  }
  if (request.method === "GET" && request.url === "/api/models") return proxyModels(response);
  if (request.method === "GET") return serveStatic(request, response);
  return sendJson(response, 405, { error: "Method not allowed" });
}).listen(port, () => {
  console.log(`Local LLM Lab: http://localhost:${port}`);
  console.log(`llama.cpp endpoint: ${client.baseUrl}`);
});
