import { useChatStore } from '../stores/chatStore'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  external: 'External',
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-[#7c6aff]/20 text-[#7c6aff] border-[#7c6aff]/30',
  admin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  member: 'bg-green-500/20 text-green-400 border-green-500/30',
  external: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  return `${days}일 전`
}

export default function Sidebar() {
  const {
    sessions,
    activeSessionId,
    createSession,
    setActiveSession,
    deleteSession,
    setSidebarOpen,
    auth,
    logout,
  } = useChatStore()

  function handleNewChat() {
    createSession()
    setSidebarOpen(false)
  }

  function handleSelectSession(id: string) {
    setActiveSession(id)
    setSidebarOpen(false)
  }

  return (
    <div className="w-[260px] h-full bg-[#1a1d27] border-r border-[#2e3147] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#7c6aff]/20 border border-[#7c6aff]/30 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h8M2 12h9" stroke="#7c6aff" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="13" cy="12" r="2.5" fill="#7c6aff"/>
            </svg>
          </div>
          <span className="font-bold text-white text-sm tracking-tight">OpsBot</span>
        </div>

        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#7c6aff]/10 border border-[#7c6aff]/20 hover:bg-[#7c6aff]/20 transition-colors text-sm text-[#7c6aff] font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          새 대화
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
        {sessions.length === 0 ? (
          <p className="text-xs text-[#4a5060] text-center mt-4 px-2">대화 기록이 없습니다</p>
        ) : (
          <div className="space-y-0.5">
            {sessions.map(session => (
              <div
                key={session.id}
                className={`
                  group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors
                  ${activeSessionId === session.id
                    ? 'bg-[#252836] text-white'
                    : 'text-[#9aa0b5] hover:bg-[#252836]/60 hover:text-[#e2e4ec]'
                  }
                `}
                onClick={() => handleSelectSession(session.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{session.title}</p>
                  <p className="text-[10px] text-[#4a5060] mt-0.5">{formatRelativeTime(session.updatedAt)}</p>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 text-[#4a5060] hover:text-red-400 transition-all p-0.5 flex-shrink-0"
                  onClick={e => {
                    e.stopPropagation()
                    deleteSession(session.id)
                  }}
                  title="삭제"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[#2e3147]">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${ROLE_COLORS[auth.role ?? 'external']}`}>
            {ROLE_LABELS[auth.role ?? 'external']}
          </span>
          <button
            onClick={logout}
            className="text-xs text-[#4a5060] hover:text-[#9aa0b5] transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  )
}
