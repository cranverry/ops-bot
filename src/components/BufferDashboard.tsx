import { useEffect, useState } from 'react'

const BASE_URL = import.meta.env.DEV ? 'http://localhost:3999' : (import.meta.env.VITE_API_URL ?? '')
const CACHE_KEY = 'buffer_dashboard_v3'
const CACHE_TTL = 60 * 60 * 1000 // 1시간 (하루 → 1시간으로 조정)

interface BrandData {
  brand:        string
  planning:     number
  illustration: number
  modeling:     number
}

interface DashData {
  brands: BrandData[]
  updatedAt: string
}

const MAX = 3

const BRAND_META: Record<string, { color: string; label: string }> = {
  OAS:  { color: '#f59e0b', label: 'OAS' },
  MRG:  { color: '#ec4899', label: 'MRG' },
  BTQ:  { color: '#06b6d4', label: 'BTQ' },
  기타: { color: '#9aa0b5', label: '기타 (미지정)' },
}

const STAGES = [
  { key: 'planning',     label: '기획 완료',   sub: '원화 진행중 포함' },
  { key: 'illustration', label: '원화 완료',   sub: '모델링 진행중 포함' },
  { key: 'modeling',     label: '모델링 완료', sub: '' },
]

function loadCache(): DashData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    // 빈 데이터 캐시는 무시 (API 키 미설정 시 저장된 0값 캐시)
    const hasData = data?.brands?.some((b: BrandData) =>
      b.planning > 0 || b.illustration > 0 || b.modeling > 0
    )
    return hasData ? data : null
  } catch { return null }
}

export default function BufferDashboard() {
  const [data, setData] = useState<DashData | null>(loadCache)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchData(force = false) {
    if (!force) {
      const cached = loadCache()
      if (cached) { setData(cached); setLoading(false); return }
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${BASE_URL}/api/buffer-status`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)

      const brands: BrandData[] = (json.brands || []).map((b: any) => ({
        brand:        b.brand,
        planning:     b.planning     ?? 0,
        illustration: b.illustration ?? 0,
        modeling:     b.modeling     ?? b.buffer ?? 0,
      }))

      const d: DashData = { brands, updatedAt: json.updatedAt }
      setData(d)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: d, ts: Date.now() }))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const brands = data?.brands ?? [
    { brand: 'OAS',  planning: 0, illustration: 0, modeling: 0 },
    { brand: 'MRG',  planning: 0, illustration: 0, modeling: 0 },
    { brand: 'BTQ',  planning: 0, illustration: 0, modeling: 0 },
    { brand: '기타', planning: 0, illustration: 0, modeling: 0 },
  ]

  return (
    <div className="border-t border-[#2e3147]">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-semibold text-[#9aa0b5]">비축량 현황</span>
        <div className="flex items-center gap-2">
          {data?.updatedAt && !loading && (
            <span className="text-[10px] text-[#4a5060]">
              {new Date(data.updatedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => fetchData(true)}
            className="text-[#4a5060] hover:text-[#9aa0b5] transition-colors p-0.5"
            title="새로고침"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M1 6a5 5 0 1 0 5-5A5 5 0 0 0 2.5 3L1 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[10px] text-red-400 px-4 pb-2">{error}</p>
      )}

      {/* Brand cards */}
      <div className="px-3 pb-4 space-y-2">
        {brands.map(b => {
          const meta = BRAND_META[b.brand] ?? { color: '#7c6aff', label: b.brand }
          const vals = [b.planning, b.illustration, b.modeling]

          return (
            <div
              key={b.brand}
              className="rounded-xl border p-3"
              style={{ borderColor: meta.color + '25', backgroundColor: meta.color + '08' }}
            >
              {/* Brand name */}
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold" style={{ color: meta.color }}>
                  {meta.label}
                </span>
                <span className="text-[10px] text-[#4a5060]">
                  총 {loading ? '…' : b.planning + b.illustration + b.modeling}건
                </span>
              </div>

              {/* Stage rows */}
              <div className="space-y-2">
                {STAGES.map((stage, si) => {
                  const count = vals[si]
                  return (
                    <div key={stage.key} className="flex items-center gap-2">
                      {/* Stage label */}
                      <div className="w-[90px] flex-shrink-0">
                        <p className="text-[10px] font-medium text-[#6b7280] leading-tight">{stage.label}</p>
                        {stage.sub && (
                          <p className="text-[9px] text-[#4a5060] leading-tight">{stage.sub}</p>
                        )}
                      </div>

                      {/* Pip dots */}
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: MAX }).map((_, i) => {
                          const filled = !loading && i < count
                          return (
                            <div
                              key={i}
                              className="w-4 h-4 rounded-full border transition-all duration-300"
                              style={{
                                borderColor: filled ? meta.color : '#2e3147',
                                backgroundColor: filled ? meta.color + '40' : 'transparent',
                              }}
                            >
                              {filled && (
                                <div
                                  className="w-full h-full rounded-full scale-50"
                                  style={{ backgroundColor: meta.color }}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Count */}
                      <span
                        className="text-xs font-bold ml-1"
                        style={{ color: loading ? '#2e3147' : (count > 0 ? meta.color : '#4a5060') }}
                      >
                        {loading ? '…' : count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
