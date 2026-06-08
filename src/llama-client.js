const trimSlash = (value) => value.replace(/\/$/, "");

export class LlamaClient {
  constructor({
    baseUrl,
    apiKey = "",
    timeoutMs = 120_000,
    fetchImplementation = fetch,
  }) {
    this.baseUrl = trimSlash(baseUrl);
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.fetch = fetchImplementation;
  }

  headers() {
    return {
      "content-type": "application/json",
      ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
    };
  }

  request(path, options = {}) {
    return this.fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...this.headers(), ...options.headers },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
  }

  async chat(body) {
    const response = await this.request("/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message || data.error || "llama.cpp request failed",
      );
    }

    return data;
  }
}

// Default client instance
export const fallbackModel = process.env.LLAMA_MODEL || "";

export const client = new LlamaClient({
  baseUrl: process.env.LLAMA_BASE_URL || "http://127.0.0.1:8080",
  apiKey: process.env.LLAMA_API_KEY,
  timeoutMs: Number(process.env.LLAMA_TIMEOUT_MS || 120_000),
});
