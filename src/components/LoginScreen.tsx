import { useState } from 'react'
import { useChatStore } from '../stores/chatStore'
import type { Role } from '../types'

const ROLES: { value: Role; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'external', label: 'External' },
]

const HARDCODED_INVITE = 'EDEN2026'

export default function LoginScreen() {
  const { login } = useChatStore()
  const [role, setRole] = useState<Role>('owner')
  const [inviteCode, setInviteCode] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handlePinInput(val: string) {
    if (/^\d{0,4}$/.test(val)) setPin(val)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (inviteCode.toUpperCase() !== HARDCODED_INVITE) {
      setError('초대 코드가 올바르지 않습니다.')
      return
    }

    if (pin.length < 4) {
      setError('PIN 4자리를 입력하세요.')
      return
    }

    setLoading(true)

    // MVP: bypass real auth, issue a fake token
    await new Promise(r => setTimeout(r, 600))

    const fakeToken = btoa(JSON.stringify({ role, iat: Date.now() }))
    localStorage.setItem('opsbot-token', fakeToken)
    login(role, fakeToken)

    setLoading(false)
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-[#0f1117] px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#7c6aff]/20 border border-[#7c6aff]/30 mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="#7c6aff" fillOpacity="0.2"/>
              <path d="M8 10h16M8 16h10M8 22h12" stroke="#7c6aff" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="24" cy="22" r="4" fill="#7c6aff"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">OpsBot</h1>
          <p className="text-sm text-[#6b7280] mt-1">FromSeoul 운영 에이전트</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#1a1d27] border border-[#2e3147] rounded-2xl p-6 space-y-4"
        >
          {/* Role selector */}
          <div>
            <label className="block text-xs font-medium text-[#9aa0b5] mb-2 uppercase tracking-wider">
              역할
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`
                    py-2 px-3 rounded-lg text-sm font-medium transition-all
                    ${role === r.value
                      ? 'bg-[#7c6aff] text-white'
                      : 'bg-[#252836] text-[#9aa0b5] hover:bg-[#2e3147]'
                    }
                  `}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Invite code */}
          <div>
            <label className="block text-xs font-medium text-[#9aa0b5] mb-2 uppercase tracking-wider">
              초대 코드
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              placeholder="XXXXXXXX"
              className="w-full bg-[#252836] border border-[#2e3147] rounded-lg px-3 py-2.5 text-sm text-[#e2e4ec] placeholder-[#4a5060] focus:outline-none focus:border-[#7c6aff] transition-colors"
              autoComplete="off"
              autoCapitalize="characters"
            />
          </div>

          {/* PIN */}
          <div>
            <label className="block text-xs font-medium text-[#9aa0b5] mb-2 uppercase tracking-wider">
              PIN (4자리)
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={e => handlePinInput(e.target.value)}
              placeholder="••••"
              className="w-full bg-[#252836] border border-[#2e3147] rounded-lg px-3 py-2.5 text-sm text-[#e2e4ec] placeholder-[#4a5060] focus:outline-none focus:border-[#7c6aff] transition-colors text-center tracking-[0.5rem]"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7c6aff] hover:bg-[#6b5aee] disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? '인증 중...' : '입장하기'}
          </button>
        </form>

        <p className="text-center text-xs text-[#4a5060] mt-4">
          FromSeoul Creative Team · Internal Use Only
        </p>
      </div>
    </div>
  )
}
