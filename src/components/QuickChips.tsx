interface Props {
  onChipClick: (text: string) => void
  disabled?: boolean
}

const CHIPS = [
  { label: '파이프라인 현황', message: '현재 OAS, MRG, BTQ 브랜드 파이프라인 현황 알려줘' },
  { label: '버퍼 확인', message: '각 브랜드 비축량 현황 알려줘' },
  { label: '리깅 체크리스트', message: '리깅 QA 체크리스트 보여줘' },
  { label: '온보딩 가이드', message: '외부 인력 온보딩 가이드 알려줘' },
]

export default function QuickChips({ onChipClick, disabled }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {CHIPS.map(chip => (
        <button
          key={chip.label}
          disabled={disabled}
          onClick={() => onChipClick(chip.message)}
          className="flex-shrink-0 px-3.5 py-1.5 rounded-full border border-[#2e3147] bg-[#1a1d27] hover:bg-[#252836] hover:border-[#7c6aff]/40 text-xs text-[#9aa0b5] hover:text-[#e2e4ec] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
