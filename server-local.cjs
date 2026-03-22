/**
 * OpsBot 서버
 * 실행: node server-local.cjs
 */
require('dotenv').config()
const express = require('express')
const path = require('path')
const fs = require('fs')
require('dotenv').config() // 중복 호출 방지용 (상단에서 이미 호출)
const { dispatchIllustration, loadDB } = require('./lib/illustration-dispatch.cjs')

// ── Knowledge Base 로드 ─────────────────────────────────────────────────────
function loadKnowledge() {
  const knowledgeDir = path.join(__dirname, 'knowledge')
  if (!fs.existsSync(knowledgeDir)) return ''
  const docs = []
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      if (name === 'README.md') continue
      const full = path.join(dir, name)
      if (fs.statSync(full).isDirectory()) { walk(full); continue }
      if (!name.endsWith('.md')) continue
      const content = fs.readFileSync(full, 'utf-8')
      const rel = path.relative(knowledgeDir, full)
      docs.push(`\n\n--- 문서: ${rel} ---\n${content}`)
    }
  }
  walk(knowledgeDir)
  return docs.join('\n')
}

const KNOWLEDGE_CONTEXT = loadKnowledge()
const KNOWLEDGE_COUNT = (KNOWLEDGE_CONTEXT.match(/--- 문서:/g) || []).length
console.log(`지식저장소: ${KNOWLEDGE_COUNT}건 로드됨`)

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

app.use(express.static(path.join(__dirname, 'dist')))

// ── 시스템 프롬프트 ─────────────────────────────────────────────────────────
const BASE_PROMPTS = {
  owner:    'Spectrum 크리에이티브 스튜디오 운영 AI입니다. 파이프라인, SOP, 버퍼, OKR, 팀원 현황을 도와줍니다. 외주 작가 착수 명령도 처리합니다. 한국어로 간결하게 답변하세요.',
  admin:    'Spectrum 운영 AI입니다. 파이프라인, SOP, 버퍼 관리를 도와줍니다. 한국어로 답변하세요.',
  member:   'Spectrum 운영 어시스턴트입니다. SOP 조회와 태스크 관리를 도와줍니다. 한국어로 답변하세요.',
  external: 'Spectrum 외부 인력 가이드입니다. 온보딩 정보와 브리프만 안내합니다. 한국어로 답변하세요.',
}

function getSystemPrompt(role) {
  const base = BASE_PROMPTS[role] || BASE_PROMPTS.external
  if (!KNOWLEDGE_CONTEXT) return base
  return `${base}\n\n## 지식저장소 (내부 문서)\n${KNOWLEDGE_CONTEXT}`
}

// ── OpenAI Function Definitions ─────────────────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'assign_illustration_work',
      description: '외주 원화가에게 작업 착수 안내 메시지를 Discord로 자동 전송한다.',
      parameters: {
        type: 'object',
        properties: {
          artist_name: {
            type: 'string',
            description: '원화가 이름 (예: 전유라, 김효은)'
          },
          task_name: {
            type: 'string',
            description: '작업명 (예: [MRG-26-2Q-D] 동양풍)'
          },
          start_date: {
            type: 'string',
            description: '작업 시작일 YYYY-MM-DD. 미입력시 내일 날짜 자동 사용'
          }
        },
        required: ['artist_name', 'task_name']
      }
    }
  }
]

// ── POST /api/chat ───────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages, role = 'external' } = req.body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not set' })

  const systemMsg = { role: 'system', content: getSystemPrompt(role) }
  const allMessages = [systemMsg, ...messages]

  try {
    // ── Step 1: Function call 감지 (non-streaming) ──────────────────────────
    const detectRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: allMessages,
        tools: TOOLS,
        tool_choice: 'auto',
        stream: false,
        temperature: 0.3,
        max_tokens: 512
      })
    })

    const detectData = await detectRes.json()
    const choice = detectData.choices?.[0]

    // ── Step 2: Function call 실행 ──────────────────────────────────────────
    if (choice?.finish_reason === 'tool_calls') {
      const toolCall = choice.message.tool_calls[0]
      const args = JSON.parse(toolCall.function.arguments)

      let funcResult
      if (toolCall.function.name === 'assign_illustration_work') {
        funcResult = await dispatchIllustration(
          args.artist_name,
          args.task_name,
          process.env.NOTION_API_KEY,
          { startDate: args.start_date }
        )
      } else {
        funcResult = { ok: false, message: '알 수 없는 함수입니다.' }
      }

      // Step 3: 결과를 GPT에 전달 → 최종 응답 생성 (streaming)
      const finalMessages = [
        ...allMessages,
        choice.message,
        {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(funcResult)
        }
      ]

      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const finalRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: finalMessages,
          stream: true,
          temperature: 0.5,
          max_tokens: 512
        })
      })

      const reader = finalRes.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(decoder.decode(value, { stream: true }))
      }
      return res.end()
    }

    // ── Step 3: Function call 없음 → 일반 스트리밍 ─────────────────────────
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const streamRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: allMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048
      })
    })

    const reader = streamRes.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(decoder.decode(value, { stream: true }))
    }
    res.end()

  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/webhook/clickup  (Path B) ─────────────────────────────────────
app.post('/api/webhook/clickup', async (req, res) => {
  res.status(200).json({ ok: true }) // ClickUp에 즉시 200 응답

  try {
    const payload = req.body
    const event = payload?.event
    console.log(`[Webhook] 수신: ${event}`)

    // 관심 이벤트: taskStatusUpdated
    if (event !== 'taskStatusUpdated') return

    const taskId = payload.task_id
    if (!taskId) return

    // ClickUp에서 태스크 상세 조회
    const apiKey = process.env.CLICKUP_API_KEY
    const taskRes = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
      headers: { 'Authorization': apiKey }
    })
    const task = await taskRes.json()

    const newStatus = task.status?.status?.toLowerCase() || ''
    const folderName = task.folder?.name || ''
    const listName = task.list?.name || ''

    // 조건: 기획 유닛 아웃소싱 폴더 + 착수 상태
    const isExternalFolder = folderName.includes('아웃소싱') || folderName.includes('기획 유닛')
    const isStartStatus = ['진행중', 'in progress', '착수', 'active'].some(s => newStatus.includes(s))

    if (!isExternalFolder || !isStartStatus) return

    console.log(`[Webhook] 착수 감지: ${task.name} | 상태: ${task.status?.status}`)

    // 태스크 이름에서 작가 이름 추출 시도
    const db = loadDB()
    const foundArtist = db.artists.find(a => task.name.includes(a.name))

    if (!foundArtist) {
      console.log(`[Webhook] 작가 매칭 실패: ${task.name}`)
      return
    }

    // 착수 알림 전송
    const result = await dispatchIllustration(
      foundArtist.name,
      task.name,
      process.env.NOTION_API_KEY,
      {}
    )
    console.log(`[Webhook] 전송 결과:`, result.message)

  } catch (e) {
    console.error('[Webhook] 처리 오류:', e.message)
  }
})

// ── GET /api/webhook/clickup (등록 확인용) ──────────────────────────────────
app.get('/api/webhook/clickup', (req, res) => {
  res.json({ status: 'ClickUp webhook endpoint active', path: '/api/webhook/clickup' })
})

// ── POST /api/auth ───────────────────────────────────────────────────────────
app.post('/api/auth', (req, res) => {
  const { inviteCode, role } = req.body
  const validCode = process.env.AUTH_INVITE_CODE || 'EDEN2026'
  if (inviteCode !== validCode) return res.status(401).json({ error: 'Invalid invite code' })
  const token = Buffer.from(JSON.stringify({ role, exp: Date.now() + 7 * 86400000 })).toString('base64')
  res.json({ token, role })
})

// ── GET /api/pipeline-status (Notion 상품기획 DB) ────────────────────────────
let _pipelineCache = null
let _pipelineCacheAt = 0
const PIPELINE_CACHE_TTL = 60 * 60 * 1000 // 1시간

app.get('/api/pipeline-status', async (req, res) => {
  try {
    // 캐시 유효하면 즉시 반환
    if (_pipelineCache && Date.now() - _pipelineCacheAt < PIPELINE_CACHE_TTL) {
      return res.json(_pipelineCache)
    }

    const notionKey = process.env.NOTION_API_KEY
    if (!notionKey) return res.status(500).json({ error: 'NOTION_API_KEY not set' })

    const DB_ID = '3161bca8582e801aa7a8ffb90539b97d'
    const r = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ page_size: 100 })
    })
    const data = await r.json()

    const counts = {}
    data.results?.forEach(p => {
      const s = p.properties?.Progress?.status?.name || '없음'
      counts[s] = (counts[s] || 0) + 1
    })

    const result = {
      planning_done:      (counts['기획 완료'] || 0) + (counts['원화 진행중'] || 0),
      illustration_done:  (counts['원화 완료'] || 0) + (counts['모델링 진행중'] || 0),
      modeling_done:      counts['모델링 완료'] || 0,
      updatedAt: new Date().toISOString(),
      raw: counts
    }

    _pipelineCache = result
    _pipelineCacheAt = Date.now()
    res.json(result)
  } catch (e) {
    console.error('[pipeline-status]', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/buffer ──────────────────────────────────────────────────────────
app.get('/api/buffer', async (req, res) => {
  try {
    const apiKey = process.env.CLICKUP_API_KEY
    if (!apiKey) return res.json({ OAS: 2, MRG: 1, BTQ: 4, threshold: 3, mock: true })
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

process.on('uncaughtException', (err) => { console.error('UNCAUGHT:', err) })
process.on('unhandledRejection', (reason) => { console.error('UNHANDLED:', reason) })

const server = app.listen(PORT, () => {
  console.log(`\n🚀 OpsBot 서버: http://localhost:${PORT}`)
  console.log(`   OpenAI: ${process.env.OPENAI_API_KEY ? '✅' : '❌'}`)
  console.log(`   ClickUp: ${process.env.CLICKUP_API_KEY ? '✅' : '❌'}`)
  console.log(`   Notion: ${process.env.NOTION_API_KEY ? '✅' : '❌'}`)
  console.log(`   Webhook: POST /api/webhook/clickup`)
  console.log(`   외부 URL: https://smellable-amelie-umbrageous.ngrok-free.dev\n`)
})
server.on('error', (err) => { console.error('SERVER ERROR:', err) })
