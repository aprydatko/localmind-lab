import { runBankingAgent } from '../banking-agent.js'
import { buildChatRequest } from '../chat-request.js'
import { client, fallbackModel } from '../client.js'

export const bankingChat = async (req, res) => {
  try {
    const input = req.body
    const chatRequest = buildChatRequest(input, fallbackModel)
    
    chatRequest.messages = [
      {
        role: 'system',
        content: 'You are a safe mock banking assistant. Use tools for account data. Never invent balances, transactions, or rates. Clearly say that all data is simulated.'
      },
      ...chatRequest.messages.filter((message) => message.role !== 'system')
    ]
    
    const result = await runBankingAgent({ client, request: chatRequest })
    res.json(result)
  } catch (error) {
    res.status(502).json({ error: error.message })
  }
}
