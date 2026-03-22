import { useEffect, useState } from 'react'

interface BrandBuffer {
  brand: string
  buffer: number      // 모델링 완료
  pipeline: number    // 기획완료~원화완료 (진행중)
  threshold: number
}

interface BufferData {
  brands: BrandBuffer[]
  updatedAt: string
}

const BASE_URL = import.meta.env.DEV
  ? 'http://localhost:3999'
  : (import.meta.env.VITE_API_URL ?? '')

const CACHE_KEY = 'buffer_status_cache'
const CACHE_TTL = 60 * 60 * 1000

function loadCache(): BufferData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch { return null }
}

const BRAND_META: Record<string, { color: string; bg: string; border: string; bar: string }> = {
  OAS: {
    color:  'text-[#f59e0b]',
    bg:     'bg-[#f59e0b]/10',
    border: 'border-[#f59e0b]/25',
    bar:    'bg-[#f59e0b]',
  },
  MRG: {
    color:  'text-[#ec4899]',
    bg:     'bg-[#ec4899]/10',
    border: 'border-[#ec4899]/25',
    bar:    'bg-[#ec4899]',
  },
  BTQ: {
    color:  'text-[#06b6d4]',
    bg:     'bg-[#06b6d4]/10',
    border: 'border-[#06b6d4]/25',
    bar:    'bg-[#06b6d4]',
  },
}

function BrandCard({ b, loading }: { b: BrandBuffer; loading: boolean }) {
  const meta = BRAND_META[b.brand] ?? BRAND_META.OAS
  const ratio = Math.min(b.buffer / b.threshold, 1)
  const overThreshold = b.buffer >= b.threshold

  return (
    <div className={`flex-1 px-3 py-2 rounded-lg border ${meta.bg} ${meta.border} min-w-0`}>
      {/* Brand + count */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[11px] font-bold tracking-wider ${meta.color}`}>{b.brand}</span>
        <div className="flex items-center gap-1">
          <span className={`text-base font-bold leading-none ${loading ? 'text-[#2e3147]' : meta.color}`}>
            {loading ? '…' : b.buffer}
          </span>
          <span className="text-[10px] text-[#4a5060]">/ {b.threshold}</span>
          {!loading && overThreshold && (
            <span className="text-[9px] text-[#22c55e] font-bold ml-0.5">✓</span>
          )}
          {!loading && !overThreshold && (
            <span className="text-[9px] text-[#f87171] font-bold ml-0.5">!</span>
          )}
        </div>
      </div>

      {/* Bar */}
      <div className="h-1 rounded-full bg-[#2e3147] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${loading ? 'bg-[#2e3147] animate-pulse' : meta.bar}`}
          style={{ width: loading ? '30%' : `${ratio * 100}%` }}
        />
      </div>

      {/* Pipeline count */}
      {!loading && b.pipeline > 0 && (
        <p className="text-[10px] text-[#4a5060] mt-1">진행중 {b.pipeline}건</p>
      )}
    </div>
  )
}

export default function BufferStatus() {
  const cached = loadCache()
  const [data, setData] = useState<BufferData | null>(cached)
  const [loading, setLoading] = useState(!cached)

  async function fetchData() {
    try {
      const res = await fetch(`${BASE_URL}/api/buffer-status`)
      const json = await res.json()
      setData(json)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: json, ts: Date.now() }))
    } catch {
      // 캐시 유지
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!cached) fetchData()
    const timer = setInterval(fetchData, CACHE_TTL)
    return () => clearInterval(timer)
  }, [])

  const brands = data?.brands ?? [
    { brand: 'OAS', buffer: 0, pipeline: 0, threshold: 3 },
    { brand: 'MRG', buffer: 0, pipeline: 0, threshold: 3 },
    { brand: 'BTQ', buffer: 0, pipeline: 0, threshold: 3 },
  ]

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[#0d0f1a] border-b border-[#2e3147] flex-shrink-0">
      {/* Label */}
      <div className="flex-shrink-0 flex items-center gap-1 mr-1">
        <span className="text-[10px] font-semibold text-[#4a5060] uppercase tracking-wider">비축량</span>
      </div>

      {/* Brand cards */}
      {brands.map(b => (
        <BrandCard key={b.brand} b={b} loading={loading} />
      ))}

      {/* Time */}
      {data?.updatedAt && (
        <div className="text-[10px] text-[#4a5060] flex-shrink-0 hidden sm:block whitespace-nowrap">
          {new Date(data.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}
