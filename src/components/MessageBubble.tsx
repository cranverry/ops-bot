import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '../types'

interface Props {
  message: Message
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end animate-[fadeIn_0.2s_ease-in-out]">
        <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-[#7c6aff]/20 border border-[#7c6aff]/40 text-[#e2e4ec] text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start animate-[fadeIn_0.2s_ease-in-out]">
      <div className="flex gap-3 max-w-[85%]">
        {/* Bot avatar */}
        <div className="w-7 h-7 rounded-lg bg-[#7c6aff]/20 border border-[#7c6aff]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 3.5h10M2 7h7M2 10.5h8" stroke="#7c6aff" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Content */}
        <div className={`flex-1 text-sm text-[#e2e4ec] pt-0.5 ${message.streaming ? 'streaming-cursor' : ''}`}>
          <div className="prose-dark">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LoadingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-3">
        <div className="w-7 h-7 rounded-lg bg-[#7c6aff]/20 border border-[#7c6aff]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 3.5h10M2 7h7M2 10.5h8" stroke="#7c6aff" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="flex items-center gap-1.5 py-2">
          <span className="loading-dot w-2 h-2 rounded-full bg-[#7c6aff]" />
          <span className="loading-dot w-2 h-2 rounded-full bg-[#7c6aff]" />
          <span className="loading-dot w-2 h-2 rounded-full bg-[#7c6aff]" />
        </div>
      </div>
    </div>
  )
}
