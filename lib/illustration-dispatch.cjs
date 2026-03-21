/**
 * illustration-dispatch.cjs
 * 외주 원화 착수 알림 핵심 로직
 * Path A (OpsBot 채팅) / Path B (ClickUp Webhook) 공용
 */
const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '../knowledge/team/external-artists.json')
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
}

function calcDeadlines(startDate) {
  const db = loadDB()
  const { phase_1_days, phase_2_days, phase_3_days } = db.schedule
  const start = new Date(startDate)
  const addDays = (n) => { const d = new Date(start); d.setDate(d.getDate() + n - 1); return d }
  const fmt = d =>
    (d.getMonth() + 1).toString().padStart(2, '0') + '.' +
    d.getDate().toString().padStart(2, '0') + '(' + DAYS[d.getDay()] + ')'
  return {
    d1: fmt(addDays(phase_1_days)),
    d2: fmt(addDays(phase_1_days + phase_2_days)),
    d3: fmt(addDays(phase_1_days + phase_2_days + phase_3_days)),
  }
}

async function findNotionPage(taskKeyword, notionKey) {
  try {
    const r = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + notionKey,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: taskKeyword, page_size: 5 })
    })
    const d = await r.json()
    const page = d.results?.find(p => {
      const titleProp = Object.values(p.properties || {}).find(v => v.type === 'title')
      const title = titleProp?.title?.[0]?.plain_text || ''
      return title.toLowerCase().includes(taskKeyword.toLowerCase())
    })
    return page?.public_url || page?.url || null
  } catch { return null }
}

async function sendDiscordMsg(channelId, content) {
  const r = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': 'Bot ' + BOT_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  })
  return r.json()
}

/**
 * 메인 착수 알림 함수
 * @param {string} artistName - 작가 이름
 * @param {string} taskName   - 작업명 (예: "[MRG-26-2Q-D] 동양풍")
 * @param {string} notionKey  - Notion API Key
 * @param {object} options    - { startDate, testMode }
 * @returns {{ ok: boolean, message: string }}
 */
async function dispatchIllustration(artistName, taskName, notionKey, options = {}) {
  const db = loadDB()
  const artist = db.artists.find(a => a.name === artistName)
  if (!artist) return { ok: false, message: `"${artistName}" 작가가 DB에 없습니다.` }

  const startDate = options.startDate || (() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10)
  })()

  // Notion 작업 명세서 검색
  const keyword = taskName.replace(/[\[\]]/g, '').trim()
  const notionUrl = await findNotionPage(keyword, notionKey)

  const guideUrl = db.sop_links[artist.role + '_guide'] || db.sop_links.illustrator_guide
  const { d1, d2, d3 } = calcDeadlines(startDate)

  const taskLine = notionUrl
    ? `- [작업 명세서](${notionUrl})`
    : `- 작업 명세서: (페이지를 찾지 못했습니다. 수동 확인 필요)`

  const msg = [
    `<@${artist.discord_id}> ${artist.name} 원화가님!`,
    `작업 관련 안내드립니다.`,
    ``,
    taskLine,
    `- [작업 지침서](${guideUrl})`,
    `- 작업 일정`,
    `  * 1차(시안3종) - ${d1} / 4일)`,
    `  * 2차(정면 고도화) - ${d2} / 4일)`,
    `  * 3차(측후면) - ${d3} / 6일)`
  ].join('\n')

  // 채널: 반드시 지정된 채널로만 전송. DM 절대 금지.
  const channelId = options.testMode ? db.test_channel : artist.channel_id
  if (!channelId) return { ok: false, message: `"${artistName}" 전용 채널이 DB에 없습니다. channel_id를 등록해주세요. (DM 전송 불가)` }
  const result = await sendDiscordMsg(channelId, msg)

  if (result.id) {
    return {
      ok: true,
      message: `✅ ${artist.name}님께 "${taskName}" 작업 착수 안내 전송 완료 (채널: <#${channelId}>)\n일정: 1차 ${d1} / 2차 ${d2} / 3차 ${d3}`
    }
  } else {
    return { ok: false, message: `Discord 전송 실패: ${JSON.stringify(result)}` }
  }
}

module.exports = { dispatchIllustration, loadDB }
