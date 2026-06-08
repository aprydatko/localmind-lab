import { capabilityCatalog } from '../capabilities.js'
import { client, fallbackModel } from '../client.js'

export const proxyModels = async (req, res) => {
  try {
    const upstream = await client.request('/v1/models')
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch {
    res.json({
      data: fallbackModel ? [{ id: fallbackModel }] : [],
      offline: true
    })
  }
}

export const getCapabilities = (req, res) => {
  res.json(capabilityCatalog)
}
