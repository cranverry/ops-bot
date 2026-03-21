import { useState } from 'react'

interface FaqSection {
  id: string
  title: string
  icon: string
  items: FaqItem[]
}

interface FaqItem {
  q: string
  a?: string
  commands?: { cmd: string; desc: string }[]
}

const FAQ_DATA: FaqSection[] = [
  {
    id: 'overview',
    title: '개요',
    icon: '◈',
    items: [
      {
        q: 'OpsBot이란?',
        a: 'Spectrum OS의 AI 오퍼레이션 인터페이스입니다. 파이프라인 조회, 명령 실행, SOP 검색, 외주 착수 알림을 자연어 한 문장으로 처리합니다.'
      },
      {
        q: '역할별 접근 권한',
        a: 'L0 Owner — 전체\nL1 Admin — 운영 전체, 재무 제외\nL2 Member — 내 태스크 + SOP\nL3 External — 내 브리프 + SOP'
      },
      {
        q: '두 가지 자동화 경로',
        a: 'Path A: OpsBot 채팅 명령 → GPT 인텐트 감지 → 즉시 실행\nPath B: ClickUp 상태 변경 → Webhook → 자동 발송 (개입 없음)'
      },
    ]
  },
  {
    id: 'pipeline',
    title: '파이프라인 조회',
    icon: '⬡',
    items: [
      {
        q: '현황 조회 명령어',
        commands: [
          { cmd: '오늘 현황 브리핑', desc: '스프린트 전체 현황 요약' },
          { cmd: 'OAS 버퍼 얼마야?', desc: '브랜드별 비축량 + 임계값 대비' },
          { cmd: '이번 KR 어때?', desc: 'Sprint OKR 달성률' },
          { cmd: '지금 블로커 뭐야?', desc: '파이프라인 블로킹 태스크' },
          { cmd: '이번 주 출시 예정?', desc: '출시 캘린더 조회' },
        ]
      }
    ]
  },
  {
    id: 'commands',
    title: '파이프라인 명령',
    icon: '▶',
    items: [
      {
        q: '태스크 명령어',
        commands: [
          { cmd: '[태스크명] 리깅 완료 처리', desc: 'ClickUp 상태 자동 업데이트' },
          { cmd: 'BTQ 기획 홀드', desc: '해당 브랜드 기획 중단 + 알림' },
          { cmd: 'BTQ 기획 재개', desc: '기획 재개 + 알림' },
          { cmd: '모델러 온보딩 링크 만들어줘', desc: 'L3 임시 접근 링크 생성' },
        ]
      }
    ]
  },
  {
    id: 'illustration',
    title: '원화 착수 자동화',
    icon: '✦',
    items: [
      {
        q: '착수 알림 명령어',
        commands: [
          { cmd: '[작가명]한테 [작업명] 착수 보내줘', desc: 'Notion 명세서 자동 검색 + 일정 계산 + Discord 발송' },
          { cmd: '전유라한테 동양풍 작업 전달해', desc: '위와 동일 (자연어 인식)' },
        ]
      },
      {
        q: '자동 발송 조건 (Path B)',
        a: 'ClickUp 기획 유닛(아웃소싱) 폴더에서 태스크 상태를 "진행중"으로 변경 시 자동 감지 → 작가명 매칭 → Discord 자동 발송'
      },
      {
        q: '일정 계산 기준',
        a: '익일부터 14일 / 1차(시안3종) 4일 · 2차(정면 고도화) 4일 · 3차(측후면) 6일\n최종 마감일은 고정, 중간 일정은 협의 가능'
      },
    ]
  },
  {
    id: 'sop',
    title: 'SOP 조회',
    icon: '☰',
    items: [
      {
        q: 'SOP 검색 명령어',
        commands: [
          { cmd: '모델링 납품 기준 알려줘', desc: '모델링 작업 지침서 검색' },
          { cmd: '리깅 체크리스트 보여줘', desc: '리깅 QA 기준 검색' },
          { cmd: '판촉 콘텐츠 기준이 뭐야?', desc: '출시 유닛 SOP 검색' },
          { cmd: '의상시트 작성 방법?', desc: '의상시트 지침서 검색' },
        ]
      }
    ]
  }
]

function AccordionItem({ section }: { section: FaqSection }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-[#2e3147] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#1e2130] hover:bg-[#252836] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[#7c6aff] text-xs font-mono">{section.icon}</span>
          <span className="text-sm font-semibold text-[#e2e4ec]">{section.title}</span>
        </div>
        <svg
          className={`w-4 h-4 text-[#4a5060] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 16 16" fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="bg-[#181b28] divide-y divide-[#2e3147]/50">
          {section.items.map((item, i) => (
            <div key={i} className="px-4 py-3">
              <p className="text-xs font-semibold text-[#9aa0b5] mb-2">{item.q}</p>

              {item.a && (
                <p className="text-xs text-[#6b7280] leading-relaxed whitespace-pre-line">{item.a}</p>
              )}

              {item.commands && (
                <div className="space-y-1.5">
                  {item.commands.map((c, j) => (
                    <div key={j} className="flex gap-2 items-start">
                      <code className="text-[11px] bg-[#7c6aff]/10 text-[#a59aff] px-2 py-0.5 rounded font-mono flex-shrink-0 border border-[#7c6aff]/20">
                        {c.cmd}
                      </code>
                      <span className="text-[11px] text-[#4a5060] pt-0.5">{c.desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface FaqPanelProps {
  open: boolean
  onClose: () => void
}

export default function FaqPanel({ open, onClose }: FaqPanelProps) {
  return (
    <>
      {/* Overlay (mobile) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`
          fixed lg:relative right-0 top-0 z-30 lg:z-auto h-full
          w-[300px] flex-shrink-0
          bg-[#1a1d27] border-l border-[#2e3147]
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#2e3147]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#7c6aff]/20 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="4" r="2" stroke="#7c6aff" strokeWidth="1.2"/>
                <path d="M1 10c0-2.2 2.2-4 5-4s5 1.8 5 4" stroke="#7c6aff" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-white">사용 가이드</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-[#4a5060] hover:text-[#9aa0b5] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
          {FAQ_DATA.map(section => (
            <AccordionItem key={section.id} section={section} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#2e3147]">
          <p className="text-[10px] text-[#4a5060] text-center">
            Spectrum OS · OpsBot v1.0
          </p>
        </div>
      </div>
    </>
  )
}
