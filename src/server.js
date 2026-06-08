import 'dotenv/config'
import express from 'express'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { proxyChat, streamChat, structuredChat } from './controllers/chat.js'
import { bankingChat } from './controllers/agent.js'
import { proxyModels, getCapabilities } from './controllers/system.js'
import { client } from './client.js'

const root = fileURLToPath(new URL('../public', import.meta.url))
const app = express()
const port = Number(process.env.PORT || 3000)

app.use(express.json({ limit: '1mb' }))

// API Routes
app.post('/api/chat', proxyChat)
app.post('/api/chat/stream', streamChat)
app.post('/api/structured', structuredChat)
app.post('/api/banking-agent', bankingChat)
app.get('/api/capabilities', getCapabilities)
app.get('/api/models', proxyModels)

// Vendor static files
app.get('/vendor/marked.js', (req, res) => {
  res.sendFile(fileURLToPath(new URL('../node_modules/marked/lib/marked.esm.js', import.meta.url)))
})
app.get('/vendor/dompurify.js', (req, res) => {
  res.sendFile(fileURLToPath(new URL('../node_modules/dompurify/dist/purify.es.mjs', import.meta.url)))
})

// Public static files
app.use(express.static(root))

// SPA fallback
app.get(/.*/, (req, res) => {
  res.sendFile(join(root, 'index.html'))
})

app.listen(port, () => {
  console.log(`Local LLM Lab: http://localhost:${port}`)
  console.log(`llama.cpp endpoint: ${client.baseUrl}`)
})
