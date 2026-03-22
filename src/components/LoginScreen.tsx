import { useState } from 'react'
import { useChatStore } from '../stores/chatStore'

const BASE_URL = import.meta.env.DEV ? 'http://localhost:3999' : (import.meta.env.VITE_API_URL ?? '')

type Step = 'login' | 'change-password'

export default function LoginScreen() {
  const { login } = useChatStore()

  const [step, setStep] = useState<Step>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingToken, setPendingToken] = useState('')
  const [pendingUser, setPendingUser] = useState<{ role: string; username: string; clickupId: number } | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!username.trim()) return setError('이름을 입력하세요.')
    if (!password) return setError('비밀번호를 입력하세요.')

    setLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '로그인 실패')
        return
      }

      if (data.mustChangePassword) {
        setPendingToken(data.token)
        setPendingUser({ role: data.role, username: data.username, clickupId: data.clickupId })
        setStep('change-password')
        return
      }

      localStorage.setItem('opsbot-token', data.token)
      login(data.role as any, data.token, data.username, data.clickupId)
    } catch {
      setError('서버 연결 오류')
    } finally {
      setLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 4) return setError('비밀번호는 4자 이상이어야 합니다.')
    if (newPassword === '0000') return setError('기본 비밀번호로는 변경할 수 없습니다.')
    if (newPassword !== confirmPassword) return setError('비밀번호가 일치하지 않습니다.')

    setLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pendingToken}` },
        body: JSON.stringify({ newPassword })
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || '변경 실패')

      localStorage.setItem('opsbot-token', pendingToken)
      login(pendingUser!.role as any, pendingToken, pendingUser!.username, pendingUser!.clickupId)
    } catch {
      setError('서버 연결 오류')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-[#0f1117] px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#7c6aff]/20 border border-[#7c6aff]/30 mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 10h16M8 16h10M8 22h12" stroke="#7c6aff" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="24" cy="22" r="4" fill="#7c6aff"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">OpsBot</h1>
          <p className="text-sm text-[#6b7280] mt-1">FromSeoul 운영 에이전트</p>
        </div>

        {/* Login */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className="bg-[#1a1d27] border border-[#2e3147] rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#9aa0b5] mb-2 uppercase tracking-wider">이름</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="박범진"
                className="w-full bg-[#252836] border border-[#2e3147] rounded-lg px-3 py-2.5 text-sm text-[#e2e4ec] placeholder-[#4a5060] focus:outline-none focus:border-[#7c6aff] transition-colors"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#9aa0b5] mb-2 uppercase tracking-wider">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••"
                className="w-full bg-[#252836] border border-[#2e3147] rounded-lg px-3 py-2.5 text-sm text-[#e2e4ec] placeholder-[#4a5060] focus:outline-none focus:border-[#7c6aff] transition-colors text-center tracking-[0.3rem]"
                autoComplete="current-password"
              />
              <p className="text-[11px] text-[#4a5060] mt-1.5">최초 로그인 비밀번호: 0000</p>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7c6aff] hover:bg-[#6b5aee] disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? '확인 중...' : '로그인'}
            </button>
          </form>
        )}

        {/* Change Password */}
        {step === 'change-password' && (
          <form onSubmit={handleChangePassword} className="bg-[#1a1d27] border border-[#2e3147] rounded-2xl p-6 space-y-4">
            <div className="text-center pb-2 border-b border-[#2e3147]">
              <p className="text-sm font-semibold text-white">비밀번호 변경 필요</p>
              <p className="text-xs text-[#6b7280] mt-1">
                <span className="text-[#7c6aff]">{pendingUser?.username}</span>님, 최초 로그인입니다.<br/>새 비밀번호를 설정해주세요.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#9aa0b5] mb-2 uppercase tracking-wider">새 비밀번호</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="4자 이상"
                className="w-full bg-[#252836] border border-[#2e3147] rounded-lg px-3 py-2.5 text-sm text-[#e2e4ec] placeholder-[#4a5060] focus:outline-none focus:border-[#7c6aff] transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#9aa0b5] mb-2 uppercase tracking-wider">비밀번호 확인</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="다시 입력"
                className="w-full bg-[#252836] border border-[#2e3147] rounded-lg px-3 py-2.5 text-sm text-[#e2e4ec] placeholder-[#4a5060] focus:outline-none focus:border-[#7c6aff] transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7c6aff] hover:bg-[#6b5aee] disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? '변경 중...' : '비밀번호 설정 완료'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-[#4a5060] mt-4">
          FromSeoul Creative Team · Internal Use Only
        </p>
      </div>
    </div>
  )
}
