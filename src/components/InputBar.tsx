import { useState, useRef, useEffect } from 'react'
import QuickChips from './QuickChips'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
}

export default function InputBar({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [disabled])

  function handleSubmit() {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  function handleChip(text: string) {
    onSend(text)
  }

  return (
    <div className="border-t border-[#2e3147] bg-[#0f1117] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <QuickChips onChipClick={handleChip} disabled={disabled} />

      <div className="mt-2 flex items-end gap-2">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            placeholder="메시지를 입력하세요..."
            className="
              w-full bg-[#1a1d27] border border-[#2e3147] rounded-2xl
              px-4 py-3 text-sm text-[#e2e4ec] placeholder-[#4a5060]
              focus:outline-none focus:border-[#7c6aff]/60
              disabled:opacity-50 resize-none overflow-hidden
              transition-colors leading-relaxed
              scrollbar-thin
            "
            style={{ minHeight: '44px' }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="
            w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0
            bg-[#7c6aff] hover:bg-[#6b5aee] disabled:opacity-40 disabled:cursor-not-allowed
            transition-all
          "
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 15L15 9L3 3V7.5L11 9L3 10.5V15Z" fill="white"/>
          </svg>
        </button>
      </div>

      <p className="text-center text-[10px] text-[#2e3147] mt-2">
        OpsBot은 실수를 할 수 있습니다. 중요한 정보는 직접 확인하세요.
      </p>
    </div>
  )
}
