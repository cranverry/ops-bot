/**
 * OpsBot 로컬 임시 서버 (ngrok 배포용)
 * 실행: node server-local.cjs
 */
require('dotenv').config()
const express = require('express')
const path = require('path')

const app = express()
const PORT = 3999

app.use(express.json())
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  next()
})

// ── 정적 파일 (dist/) ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')))

// ── 시스템 프롬프트 ─────────────────────────────────────────────────────────
const SYSTEM_PROMPTS = {
  owner:    '당신은 FromSeoul 크리에이티브팀의 운영 AI 에이전트입니다. OAS, MRG, BTQ 3개 Booth.pm 의상 브랜드를 운영합니다. 파이프라인 현황, SOP, 버퍼 관리를 도와줍니다. 한국어로 간결하게 답변하세요.',
  admin:    '당신은 FromSeoul 크리에이티브팀의 운영 AI 에이전트입니다. 파이프라인 현황, SOP, 버퍼 관리를 도와줍니다. 한국어로 답변하세요.',
  member:   '당신은 FromSeoul 크리에이티브팀 운영 어시스턴트입니다. SOP 조회와 태스크 관리를 도와줍니다. 한국어로 답변하세요.',
  external: '당신은 FromSeoul 외부 인력 가이드입니다. 온보딩 정보와 브리프만 안내합니다. 민감한 비즈니스 정보는 제공하지 않습니다. 한국어로 답변하세요.',
}

// ── POST /api/chat ───────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages, role = 'external' } = req.body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not set' })
  }

  const systemPrompt = SYSTEM_PROMPTS[role] || SYSTEM_PROMPTS.external
  const openaiMessages = [{ role: 'system', content: systemPrompt }, ...messages]

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: openaiMessages, stream: true, temperature: 0.7, max_tokens: 2048 }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.text()
      return res.status(openaiRes.status).json({ error: err })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const reader = openaiRes.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(decoder.decode(value, { stream: true }))
    }
    res.end()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/auth ────────────────────────────────────────────────────────────
app.post('/api/auth', (req, res) => {
  const { inviteCode, role } = req.body
  const validCode = process.env.AUTH_INVITE_CODE || 'EDEN2026'
  if (inviteCode !== validCode) return res.status(401).json({ error: 'Invalid invite code' })
  // MVP: return simple token
  const token = Buffer.from(JSON.stringify({ role, exp: Date.now() + 7 * 86400000 })).toString('base64')
  res.json({ token, role })
})

// ── GET /api/buffer ──────────────────────────────────────────────────────────
app.get('/api/buffer', async (req, res) => {
  try {
    const apiKey = process.env.CLICKUP_API_KEY
    if (!apiKey) return res.json({ OAS: 2, MRG: 1, BTQ: 4, threshold: 3, mock: true })
    // 실제 ClickUp 쿼리 (추후 구현)
    res.json({ OAS: 2, MRG: 1, BTQ: 4, threshold: 3, mock: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/pipeline ────────────────────────────────────────────────────────
app.get('/api/pipeline', async (req, res) => {
  res.json({
    brands: {
      OAS: { planning: 1, modeling: 2, texturing: 1, rigging: 0, qa: 1, ready: 2 },
      MRG: { planning: 2, modeling: 1, texturing: 0, rigging: 1, qa: 0, ready: 1 },
      BTQ: { planning: 0, modeling: 2, texturing: 2, rigging: 1, qa: 1, ready: 4 },
    },
    mock: true
  })
})

// ── SPA fallback ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

process.on('uncaughtException', (err) => { console.error('UNCAUGHT:', err); process.exit(1) })
process.on('unhandledRejection', (reason) => { console.error('UNHANDLED:', reason); })

const server = app.listen(PORT, () => {
  console.log(`\n🚀 OpsBot 로컬 서버 실행 중: http://localhost:${PORT}`)
  console.log(`   OpenAI 키: ${process.env.OPENAI_API_KEY ? '✅ 설정됨' : '❌ 없음'}`)
  console.log(`   ClickUp 키: ${process.env.CLICKUP_API_KEY ? '✅ 설정됨' : '❌ 없음'}`)
  console.log(`\n   ngrok으로 외부 공개:`)
  console.log(`   ngrok http ${PORT}\n`)
  console.log(`   외부 URL: https://smellable-amelie-umbrageous.ngrok-free.dev\n`)
})
server.on('error', (err) => { console.error('SERVER ERROR:', err); })
