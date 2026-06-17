export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const token = process.env.REACT_APP_REPORTEI_TOKEN
  const { path } = req.query

  if (!path) return res.status(400).json({ error: 'path required' })

  const url = `https://app.reportei.com/api/v2/${path}`

  try {
    const options = {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }

    if (req.method === 'POST' && req.body) {
      options.body = JSON.stringify(req.body)
    }

    const response = await fetch(url, options)
    const data = await response.json()
    return res.status(response.status).json(data)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
