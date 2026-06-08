<div align="center">

# LocalMind Lab

### A hands-on playground for building applications with local LLMs

Explore chat completions, token streaming, structured output, prompt engineering,
and tool-calling agents through an OpenAI-compatible `llama.cpp` API.

[Getting Started](#getting-started) · [Features](#features) · [API](#api-reference) · [How It Works](#how-it-works)

</div>

---

## Overview

LocalMind Lab is a compact, dependency-light Node.js application for learning
how modern LLM products work behind the interface. It exposes the complete
request lifecycle: browser input, server-side validation, model inference,
streaming events, schema validation, tool execution, and token usage.

The project runs entirely against a local `llama.cpp` server. No cloud LLM
provider or frontend framework is required.

> [!NOTE]
> The banking assistant uses simulated account data and exchange rates. It is a
> tool-calling demonstration, not a real financial service.

## Features

| Feature | What it demonstrates |
| --- | --- |
| Chat completions | Roles, message history, temperature, and output limits |
| SSE streaming | Incremental token delivery from model to browser |
| Prompt builder | Structured prompts with context, constraints, and output rules |
| Temperature comparison | The same prompt evaluated with multiple sampling settings |
| Structured output | JSON extraction, Zod validation, retries, and a safe fallback |
| Tool calling | Multi-step agent loop with model-selected JavaScript functions |
| Agent trace | Model decisions, tool arguments, results, iterations, and usage |
| Capability catalog | Discoverable tool definitions and planned reusable skills |
| Markdown rendering | GitHub-flavored Markdown sanitized with DOMPurify |
| Error handling | Request validation, timeouts, offline model discovery, and stream errors |

## How It Works

```text
Browser
   |
   | HTTP / Server-Sent Events
   v
Node.js application
   |
   | OpenAI-compatible API
   v
llama.cpp server
   |
   v
Local GGUF model
```

For a tool-calling request, the application runs an agent loop:

```text
User request
  -> model chooses a tool
  -> Node.js executes the mock function
  -> tool result is appended to the conversation
  -> model produces an answer or requests another tool
```

The loop is limited to five model iterations to prevent unbounded execution.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- A local [llama.cpp](https://github.com/ggml-org/llama.cpp) server
- A chat-capable GGUF model

### 1. Start the model server

```powershell
llama-server `
  -m "D:\models\model.gguf" `
  --host 127.0.0.1 `
  --port 8080 `
  -c 8192
```

Tool calling depends on the selected model and its chat template. Models without
tool-call support may return plain text instead of `tool_calls`.

### 2. Configure the application

```powershell
Copy-Item .env.example .env
```

Available environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Local application port |
| `LLAMA_BASE_URL` | `http://127.0.0.1:8080` | llama.cpp URL without `/v1` |
| `LLAMA_MODEL` | empty | Fallback model identifier |
| `LLAMA_API_KEY` | empty | Optional bearer token |
| `LLAMA_TIMEOUT_MS` | `120000` | Upstream request timeout in milliseconds |

### 3. Install and run

```powershell
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

For development with automatic server restarts:

```powershell
npm run dev
```

## Learning Modes

### Chat Completion

Edit the message array and experiment with `system`, `user`, and `assistant`
roles. Adjust temperature and maximum output tokens, or compare the same prompt
at temperatures `0`, `0.7`, and `1`.

### Prompt Builder

Build an English prompt from role, task, context, constraints, output format,
and prompt-structure techniques. The preview updates immediately and inserts
separate system and user messages.

### Streaming

`POST /api/chat/stream` forwards `stream: true` to llama.cpp and proxies its
Server-Sent Events directly to the browser.

### Validated JSON

The structured-output workflow:

1. Adds a system prompt describing the required JSON shape.
2. Extracts JSON from the model response.
3. Validates the object with Zod.
4. Sends validation feedback to the model when the response is invalid.
5. Returns an explicit fallback after three failed attempts.

The schema is defined in [`src/structured-output.js`](src/structured-output.js).

### Banking Agent

The sample agent can call three local mock tools:

- `get_balance`
- `get_transactions`
- `get_exchange_rate`

Every model decision and tool execution is recorded in the UI trace and logged
to the server console with `[agent]` and `[tool]` prefixes.

## API Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/models` | Lists models exposed by llama.cpp |
| `GET` | `/api/capabilities` | Returns available tools and planned skills |
| `POST` | `/api/chat` | Runs a standard chat completion |
| `POST` | `/api/chat/stream` | Streams a completion over SSE |
| `POST` | `/api/structured` | Produces schema-validated document analysis |
| `POST` | `/api/banking-agent` | Runs the mock tool-calling agent |

Example request:

```json
{
  "model": "local-model",
  "messages": [
    {
      "role": "user",
      "content": "Explain why structured output is useful."
    }
  ],
  "temperature": 0.7,
  "max_tokens": 512
}
```

## Project Structure

```text
localmind-lab/
├── public/
│   ├── app.js                 # Browser interactions and API calls
│   ├── index.html             # Playground interface
│   ├── markdown.js            # Safe Markdown rendering
│   └── styles.css             # Application styles
├── src/
│   ├── banking-agent.js       # Tool definitions and agent loop
│   ├── capabilities.js        # Tools and skills catalog
│   ├── chat-request.js        # Input validation and request building
│   ├── llama-client.js        # OpenAI-compatible llama.cpp client
│   ├── server.js              # HTTP routes, SSE proxy, and static files
│   └── structured-output.js   # Zod schema and retry workflow
└── test/                      # Node.js unit tests
```

## Tokens and Context

`prompt_tokens` includes the system prompt, message history, tool definitions,
and previous tool results. `completion_tokens` covers model-generated text and
tool calls. Their sum must fit inside the context window configured with
`llama-server -c`.

For agent runs, usage is accumulated across every model call. Input usage
usually increases each iteration because the conversation includes earlier tool
calls and results.

`max_tokens` limits only newly generated output. If a response is truncated,
inspect `finish_reason` and increase the limit without exceeding the available
context window.

## Testing

```powershell
npm test
```

Tests cover chat request validation, structured-output parsing and retries, and
the banking agent loop.

## Security Notes

- Model-generated Markdown is sanitized with DOMPurify before rendering.
- Request bodies are limited to 1 MB.
- Upstream model calls use a configurable timeout.
- Banking data and exchange rates are hard-coded simulations.
- This learning project does not include production authentication,
  authorization, persistence, or rate limiting.

## Tech Stack

- Node.js HTTP server
- Vanilla JavaScript
- llama.cpp OpenAI-compatible API
- Zod
- Marked
- DOMPurify

## License

No license has been added yet. Add one before distributing or accepting
external contributions.
