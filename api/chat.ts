import type { VercelRequest, VercelResponse } from '@vercel/node'

const SYSTEM_PROMPTS: Record<string, string> = {
  owner:
    '당신은 FromSeoul 크리에이티브팀의 운영 AI 에이전트입니다. OAS, MRG, BTQ 3개 Booth.pm 의상 브랜드를 운영합니다. 파이프라인 현황, SOP, 버퍼 관리를 도와줍니다. 한국어로 답변하세요.',
  admin:
    '당신은 FromSeoul 크리에이티브팀의 운영 AI 에이전트입니다. OAS, MRG, BTQ 3개 Booth.pm 의상 브랜드를 운영합니다. 파이프라인 현황, SOP, 버퍼 관리를 도와줍니다. 한국어로 답변하세요.',
  member:
    '당신은 FromSeoul 크리에이티브팀 운영 어시스턴트입니다. SOP 조회와 자신의 태스크 관리를 도와줍니다. 한국어로 답변하세요.',
  external:
    '당신은 FromSeoul 외부 인력 가이드입니다. 온보딩 정보와 담당 브리프만 안내합니다. 민감한 비즈니스 정보는 제공하지 않습니다. 한국어로 답변하세요.',
}

// Mock SSE stream for when OPENAI_API_KEY is not set
async function mockStream(res: VercelResponse, userMessage: string) {
  const mockResponses: Record<string, string> = {
    '파이프라인': '## 파이프라인 현황\n\n**⚠️ OpenAI API 키가 설정되지 않아 모의 응답을 반환합니다.**\n\n| 브랜드 | QA 통과 | 출시 준비 | 총계 |\n|--------|---------|---------|------|\n| OAS | 3 | 2 | 5 |\n| MRG | 1 | 1 | 2 |\n| BTQ | 4 | 3 | 7 |\n\n실제 데이터는 ClickUp 연동 후 확인 가능합니다.',
    '비축량': '## 비축량 현황\n\n**⚠️ OpenAI API 키가 설정되지 않아 모의 응답을 반환합니다.**\n\n- **OAS**: 2개 (임계값 3 미달 ⚠️)\n- **MRG**: 1개 (임계값 3 미달 ⚠️)\n- **BTQ**: 4개 (정상 ✅)',
    default: '**⚠️ OpenAI API 키가 설정되지 않았습니다.**\n\n`.env` 파일에 `OPENAI_API_KEY`를 설정하면 실제 AI 응답을 받을 수 있습니다.\n\n현재는 모의(Mock) 모드로 동작 중입니다.',
  }

  let response = mockResponses.default
  if (userMessage.includes('파이프라인') || userMessage.includes('pipeline')) {
    response = mockResponses['파이프라인']
  } else if (userMessage.includes('비축량') || userMessage.includes('버퍼') || userMessage.includes('buffer')) {
    response = mockResponses['비축량']
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  // Stream character by character with slight delay
  const words = response.split(' ')
  for (const word of words) {
    const chunk = JSON.stringify({
      choices: [{ delta: { content: word + ' ' } }],
    })
    res.write(`data: ${chunk}\n\n`)
    await new Promise(r => setTimeout(r, 30))
  }

  res.write('data: [DONE]\n\n')
  res.end()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, role = 'external' } = req.body as {
    messages: { role: string; content: string }[]
    role: string
  }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' })
  }

  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    // Return mock streaming response
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content ?? ''
    return await mockStream(res, lastUserMessage)
  }

  const systemPrompt = SYSTEM_PROMPTS[role] ?? SYSTEM_PROMPTS.external

  const openaiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  })

  if (!openaiRes.ok) {
    const error = await openaiRes.text()
    return res.status(openaiRes.status).json({ error })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (!openaiRes.body) {
    return res.status(500).json({ error: 'No response body' })
  }

  const reader = openaiRes.body.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      res.write(chunk)
    }
  } finally {
    res.end()
  }
}
