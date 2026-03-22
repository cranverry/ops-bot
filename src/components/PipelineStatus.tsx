import { useEffect, useState } from 'react'

interface PipelineCount {
  planning_done: number   // 기획 완료 + 원화 진행중
  illustration_done: number  // 원화 완료 + 모델링 진행중
  modeling_done: number  // 모델링 완료
  updatedAt: string
}

const BASE_URL = import.meta.env.DEV
  ? 'http://localhost:3999'
  : (import.meta.env.VITE_API_URL ?? '')

const CACHE_KEY = 'pipeline_status_cache'
const CACHE_TTL = 60 * 60 * 1000 // 1시간

function loadCache(): PipelineCount | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch { return null }
}

function saveCache(data: PipelineCount) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
}

export default function PipelineStatus() {
  const [data, setData] = useState<PipelineCount | null>(loadCache)
  const [loading, setLoading] = useState(!loadCache())

  async function fetch_data() {
    try {
      const res = await fetch(`${BASE_URL}/api/pipeline-status`)
      const json = await res.json()
      setData(json)
      saveCache(json)
    } catch {
      // 실패 시 캐시 유지
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!loadCache()) fetch_data()
    // 1시간마다 갱신
    const timer = setInterval(fetch_data, CACHE_TTL)
    return () => clearInterval(timer)
  }, [])

  const stats = [
    {
      label: '기획 완료',
      sub: '원화 진행중 포함',
      value: data?.planning_done ?? '-',
      color: 'text-[#7c6aff]',
      bg: 'bg-[#7c6aff]/10',
      border: 'border-[#7c6aff]/20',
      dot: 'bg-[#7c6aff]',
    },
    {
      label: '원화 완료',
      sub: '모델링 진행중 포함',
      value: data?.illustration_done ?? '-',
      color: 'text-[#3b9eff]',
      bg: 'bg-[#3b9eff]/10',
      border: 'border-[#3b9eff]/20',
      dot: 'bg-[#3b9eff]',
    },
    {
      label: '모델링 완료',
      sub: '출시 대기',
      value: data?.modeling_done ?? '-',
      color: 'text-[#22c55e]',
      bg: 'bg-[#22c55e]/10',
      border: 'border-[#22c55e]/20',
      dot: 'bg-[#22c55e]',
    },
  ]

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[#0f1117] border-b border-[#2e3147] flex-shrink-0">
      {stats.map(s => (
        <div
          key={s.label}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${s.bg} ${s.border} flex-1`}
        >
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${loading ? 'bg-[#2e3147] animate-pulse' : s.dot}`} />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-base font-bold leading-none ${loading ? 'text-[#2e3147]' : s.color}`}>
                {loading ? '…' : s.value}
              </span>
              <span className="text-[11px] font-medium text-[#9aa0b5] truncate">{s.label}</span>
            </div>
            <p className="text-[10px] text-[#4a5060] mt-0.5 truncate">{s.sub}</p>
          </div>
        </div>
      ))}
      {data?.updatedAt && (
        <div className="text-[10px] text-[#4a5060] flex-shrink-0 hidden sm:block">
          {new Date(data.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준
        </div>
      )}
    </div>
  )
}
