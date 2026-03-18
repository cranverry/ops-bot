import type { VercelRequest, VercelResponse } from '@vercel/node'

interface BufferStatus {
  OAS: number
  MRG: number
  BTQ: number
  threshold: number
  source: 'live' | 'mock'
  fetchedAt: string
}

async function fetchClickUpBuffer(): Promise<Omit<BufferStatus, 'source' | 'fetchedAt'>> {
  const apiKey = process.env.CLICKUP_API_KEY
  const teamId = process.env.CLICKUP_TEAM_ID ?? '90182322460'

  if (!apiKey) {
    throw new Error('CLICKUP_API_KEY not set')
  }

  // Fetch all tasks in the team, filter by status
  const res = await fetch(
    `https://api.clickup.com/api/v2/team/${teamId}/task?statuses[]=qa%20passed&statuses[]=launch%20ready&subtasks=true&include_closed=false`,
    {
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!res.ok) {
    throw new Error(`ClickUp API error: ${res.status}`)
  }

  const data = await res.json() as { tasks: Array<{ name: string; status: { status: string }; list: { name: string } }> }
  const tasks = data.tasks ?? []

  // Count by brand prefix in task name or list name
  const counts = { OAS: 0, MRG: 0, BTQ: 0 }
  for (const task of tasks) {
    const name = (task.name + ' ' + task.list?.name ?? '').toUpperCase()
    if (name.includes('OAS')) counts.OAS++
    else if (name.includes('MRG')) counts.MRG++
    else if (name.includes('BTQ')) counts.BTQ++
  }

  return { ...counts, threshold: 3 }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')

  try {
    const data = await fetchClickUpBuffer()
    return res.status(200).json({
      ...data,
      source: 'live',
      fetchedAt: new Date().toISOString(),
    } satisfies BufferStatus)
  } catch {
    // Fallback to mock data
    return res.status(200).json({
      OAS: 2,
      MRG: 1,
      BTQ: 4,
      threshold: 3,
      source: 'mock',
      fetchedAt: new Date().toISOString(),
    } satisfies BufferStatus)
  }
}
