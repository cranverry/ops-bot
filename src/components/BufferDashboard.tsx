import { useEffect, useState } from 'react'

const BASE_URL = import.meta.env.DEV ? 'http://localhost:3999' : (import.meta.env.VITE_API_URL ?? '')
const CACHE_KEY = 'buffer_dashboard_v2'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 하루

interface BrandData {
  brand: string
  planning:     number  // 기획 완료 + 원화 진행중
  illustration: number  // 원화 완료 + 모델링 진행중
  modeling:     number  // 모델링 완료
}

interface DashData {
  brands: BrandData[]
  updatedAt: string
}

const MAX = 3

const BRAND_COLOR: Record<string, string> = {
  OAS: '#f59e0b',
  MRG: '#ec4899',
  BTQ: '#06b6d4',
}

const STAGE_LABELS = [
  { key: 'planning',     label: '기획 완료',  sub: '원화 진행중 포함' },
  { key: 'illustration', label: '원화 완료',  sub: '모델링 진행중 포함' },
  { key: 'modeling',     label: '모델링 완료', sub: '' },
]

function Pip({ filled, color }: { filled: boolean; color: string }) {
  return (
    <div
      className="w-5 h-5 rounded-full border transition-all duration-300 flex items-center justify-center"
      style={{
        borderColor: filled ? color : '#2e3147',
        backgroundColor: filled ? color + '33' : 'transparent',
      }}
    >
      {filled && (
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      )}
    </div>
  )
}

function loadCache(): DashData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch { return null }
}

export default function BufferDashboard() {
  const cached = loadCache()
  const [data, setData] = useState<DashData | null>(cached)
  const [loading, setLoading] = useState(!cached)

  async function fetchData() {
    try {
      const res = await fetch(`${BASE_URL}/api/buffer-status`)
      const json = await res.json()

      // 서버 응답 → 대시보드 형식으로 변환
      const brands: BrandData[] = (json.brands || []).map((b: any) => ({
        brand:        b.brand,
        planning:     b.planning ?? 0,
        illustration: b.illustration ?? 0,
        modeling:     b.buffer ?? 0,
      }))

      const d: DashData = { brands, updatedAt: json.updatedAt }
      setData(d)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: d, ts: Date.now() }))
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
    { brand: 'OAS', planning: 0, illustration: 0, modeling: 0 },
    { brand: 'MRG', planning: 0, illustration: 0, modeling: 0 },
    { brand: 'BTQ', planning: 0, illustration: 0, modeling: 0 },
  ]

  return (
    <div className="border-t border-[#2e3147] mt-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-semibold text-[#9aa0b5]">비축량 현황</span>
        <div className="flex items-center gap-2">
          {data?.updatedAt && (
            <span className="text-[10px] text-[#4a5060]">
              {new Date(data.updatedAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} 기준
            </span>
          )}
          <button
            onClick={fetchData}
            className="text-[#4a5060] hover:text-[#9aa0b5] transition-colors"
            title="새로고침"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M1 6a5 5 0 1 0 5-5A5 5 0 0 0 2.2 3L1 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Stage labels */}
      <div className="grid grid-cols-3 gap-0 px-4 mb-2">
        {STAGE_LABELS.map(s => (
          <div key={s.key} className="text-center">
            <p className="text-[10px] font-medium text-[#6b7280]">{s.label}</p>
            {s.sub && <p className="text-[9px] text-[#4a5060] leading-tight">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Brand rows */}
      <div className="px-3 pb-4 space-y-3">
        {brands.map(b => {
          const color = BRAND_COLOR[b.brand] || '#7c6aff'
          const stages = [b.planning, b.illustration, b.modeling]

          return (
            <div key={b.brand} className="flex items-center gap-2">
              {/* Brand label */}
              <div
                className="w-10 flex-shrink-0 text-center py-1 rounded-md text-[11px] font-bold"
                style={{ color, backgroundColor: color + '18', border: `1px solid ${color}30` }}
              >
                {b.brand}
              </div>

              {/* Stage pips */}
              <div className="flex-1 grid grid-cols-3 gap-1">
                {stages.map((count, si) => (
                  <div key={si} className="flex items-center justify-center gap-1">
                    {Array.from({ length: MAX }).map((_, i) => (
                      <Pip key={i} filled={!loading && i < count} color={color} />
                    ))}
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="w-8 flex-shrink-0 text-right">
                <span className="text-[11px] font-bold" style={{ color: loading ? '#2e3147' : color }}>
                  {loading ? '…' : b.planning + b.illustration + b.modeling}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
