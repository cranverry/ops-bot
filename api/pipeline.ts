import type { VercelRequest, VercelResponse } from '@vercel/node'

interface PipelineStage {
  name: string
  count: number
}

interface BrandPipeline {
  brand: string
  stages: PipelineStage[]
  total: number
}

interface PipelineResponse {
  brands: BrandPipeline[]
  source: 'live' | 'mock'
  fetchedAt: string
}

const MOCK_PIPELINE: Omit<PipelineResponse, 'fetchedAt'> = {
  brands: [
    {
      brand: 'OAS',
      stages: [
        { name: '모델링', count: 2 },
        { name: '리깅', count: 1 },
        { name: 'QA 검토', count: 3 },
        { name: 'QA 통과', count: 2 },
        { name: '출시 준비', count: 1 },
      ],
      total: 9,
    },
    {
      brand: 'MRG',
      stages: [
        { name: '모델링', count: 1 },
        { name: '리깅', count: 2 },
        { name: 'QA 검토', count: 1 },
        { name: 'QA 통과', count: 1 },
        { name: '출시 준비', count: 0 },
      ],
      total: 5,
    },
    {
      brand: 'BTQ',
      stages: [
        { name: '모델링', count: 3 },
        { name: '리깅', count: 2 },
        { name: 'QA 검토', count: 2 },
        { name: 'QA 통과', count: 3 },
        { name: '출시 준비', count: 1 },
      ],
      total: 11,
    },
  ],
  source: 'mock',
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

  // TODO: Wire up live ClickUp data in M2
  return res.status(200).json({
    ...MOCK_PIPELINE,
    fetchedAt: new Date().toISOString(),
  } satisfies PipelineResponse)
}
