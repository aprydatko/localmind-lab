import { LlamaClient } from './llama-client.js'

export const fallbackModel = process.env.LLAMA_MODEL || ''

export const client = new LlamaClient({
  baseUrl: process.env.LLAMA_BASE_URL || 'http://127.0.0.1:8080',
  apiKey: process.env.LLAMA_API_KEY,
  timeoutMs: Number(process.env.LLAMA_TIMEOUT_MS || 120_000)
})
