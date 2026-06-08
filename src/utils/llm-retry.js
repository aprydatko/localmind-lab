export const runWithRetry = async ({
  client,
  request,
  parser,
  systemPrompt,
  attempts = 3,
  getCorrectionPrompt = (error) => `Your response failed validation: ${error.message}. Please correct your response.`
}) => {
  let messages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    ...request.messages.filter((message) => message.role !== 'system')
  ]
  let lastError
  let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await client.chat({ ...request, messages, stream: false })
    const content = result.choices?.[0]?.message?.content || ''
    
    usage = {
      prompt_tokens: usage.prompt_tokens + (result.usage?.prompt_tokens || 0),
      completion_tokens: usage.completion_tokens + (result.usage?.completion_tokens || 0),
      total_tokens: usage.total_tokens + (result.usage?.total_tokens || 0)
    }

    try {
      const data = await parser(content)
      return { data, attempts: attempt, usage }
    } catch (error) {
      lastError = error
      messages = [
        ...messages,
        { role: 'assistant', content },
        {
          role: 'user',
          content: getCorrectionPrompt(error)
        }
      ]
    }
  }

  return {
    fallback: true,
    attempts,
    validationError: lastError?.message,
    usage
  }
}
