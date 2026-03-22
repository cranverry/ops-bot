import { useEffect, useRef, useState } from 'react'
import { useChatStore } from '../stores/chatStore'
import { streamChat } from '../api/chat'
import MessageBubble, { LoadingBubble } from './MessageBubble'
import InputBar from './InputBar'
import PipelineStatus from './PipelineStatus'
import BufferStatus from './BufferStatus'
import MyTasksModal from './MyTasksModal'
import type { Role } from '../types'

export default function ChatWindow() {
  const {
    getActiveSession,
    activeSessionId,
    addMessage,
    updateMessage,
    auth,
    setSidebarOpen,
    createSession,
  } = useChatStore()

  const [isLoading, setIsLoading] = useState(false)
  const [showMyTasks, setShowMyTasks] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const session = getActiveSession()
  const messages = session?.messages ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isLoading])

  async function handleSend(text: string) {
    if (isLoading) return

    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = createSession()
    }

    // Add user message
    addMessage(sessionId, { role: 'user', content: text })

    // Add empty bot message (will stream into)
    const botId = addMessage(sessionId, { role: 'assistant', content: '', streaming: true })

    setIsLoading(true)

    const history = (getActiveSession()?.messages ?? [])
      .filter(m => m.id !== botId && m.role !== undefined)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    let accumulated = ''

    await streamChat(history, auth.role as Role, {
      onToken: (token) => {
        accumulated += token
        updateMessage(sessionId!, botId, accumulated, true)
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      },
      onDone: () => {
        updateMessage(sessionId!, botId, accumulated, false)
        setIsLoading(false)
      },
      onError: (err) => {
        const errMsg = `오류가 발생했습니다: ${err.message}`
        updateMessage(sessionId!, botId, errMsg, false)
        setIsLoading(false)
      },
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2e3147] bg-[#0f1117] flex-shrink-0">
        {/* Mobile menu button */}
        <button
          className="md:hidden text-[#9aa0b5] hover:text-[#e2e4ec] transition-colors"
          onClick={() => setSidebarOpen(true)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="flex-1">
          <h2 className="text-sm font-semibold text-[#e2e4ec] truncate">
            {session?.title ?? '새 대화'}
          </h2>
          <p className="text-xs text-[#4a5060]">
            {messages.length > 0 ? `${messages.length}개 메시지` : 'FromSeoul OpsBot'}
          </p>
        </div>

        {/* My Tasks button */}
        <button
          onClick={() => setShowMyTasks(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252836] border border-[#2e3147] hover:border-[#7c6aff]/40 hover:bg-[#7c6aff]/10 transition-colors text-xs text-[#9aa0b5] hover:text-[#a59aff] flex-shrink-0"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="1" y="1" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4 4.5h5M4 6.5h5M4 8.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          내 할일
        </button>
      </div>

      {/* My Tasks Modal */}
      {showMyTasks && <MyTasksModal onClose={() => setShowMyTasks(false)} />}

      {/* Buffer Status Bar */}
      <BufferStatus />

      {/* Pipeline Status Bar */}
      <PipelineStatus />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6">
        {messages.length === 0 ? (
          <WelcomeScreen onChipClick={handleSend} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <LoadingBubble />
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0">
        <InputBar onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  )
}

function WelcomeScreen({ onChipClick }: { onChipClick: (text: string) => void }) {
  const { auth } = useChatStore()

  const WELCOME_CHIPS = [
    { label: '파이프라인 현황', message: '현재 OAS, MRG, BTQ 브랜드 파이프라인 현황 알려줘' },
    { label: '버퍼 확인', message: '각 브랜드 비축량 현황 알려줘' },
    { label: '리깅 체크리스트', message: '리깅 QA 체크리스트 보여줘' },
    { label: '온보딩 가이드', message: '외부 인력 온보딩 가이드 알려줘' },
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-full text-center px-4 py-12">
      <div className="w-16 h-16 rounded-2xl bg-[#7c6aff]/20 border border-[#7c6aff]/30 flex items-center justify-center mb-4">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M6 9h20M6 16h14M6 23h16" stroke="#7c6aff" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="25" cy="23" r="5" fill="#7c6aff"/>
        </svg>
      </div>

      <h2 className="text-xl font-bold text-white mb-1">안녕하세요!</h2>
      <p className="text-sm text-[#6b7280] mb-8">
        FromSeoul 운영 에이전트입니다
        {auth.role && ` · ${auth.role.charAt(0).toUpperCase() + auth.role.slice(1)}`}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
        {WELCOME_CHIPS.map(chip => (
          <button
            key={chip.label}
            onClick={() => onChipClick(chip.message)}
            className="px-4 py-3 rounded-xl border border-[#2e3147] bg-[#1a1d27] hover:bg-[#252836] hover:border-[#7c6aff]/40 text-sm text-[#9aa0b5] hover:text-[#e2e4ec] transition-all text-left"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}
