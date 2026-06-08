import { buildChatRequest } from '../chat-request.js'
import { runStructuredAnalysis } from '../structured-output.js'
import { client, fallbackModel } from '../client.js'

export const proxyChat = async (req, res) => {
  try {
    const input = req.body
    const result = await client.chat(buildChatRequest(input, fallbackModel))
    res.json(result)
  } catch (error) {
    res.status(502).json({ error: error.message })
  }
}

export const structuredChat = async (req, res) => {
  try {
    const input = req.body
    const result = await runStructuredAnalysis({
      client,
      request: buildChatRequest(input, fallbackModel)
    })
    res.json(result)
  } catch (error) {
    res.status(502).json({ error: error.message })
  }
}

export const streamChat = async (req, res) => {
  try {
    const input = req.body
    const upstream = await client.request('/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify(buildChatRequest(input, fallbackModel, { stream: true }))
    })

    if (!upstream.ok || !upstream.body) {
      const data = await upstream.json()
      return res.status(upstream.status).json(data)
    }

    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      connection: 'keep-alive'
    })

    for await (const chunk of upstream.body) res.write(chunk)
    res.end()
  } catch (error) {
    if (!res.headersSent) return res.status(502).json({ error: error.message })
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
    res.end()
  }
}
