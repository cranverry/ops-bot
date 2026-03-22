import { useEffect, useState } from 'react'
import { useChatStore } from '../stores/chatStore'

const BASE_URL = import.meta.env.DEV ? 'http://localhost:3999' : (import.meta.env.VITE_API_URL ?? '')

interface Task {
  id: string
  name: string
  status: string
  statusColor: string
  folder: string
  list: string
  startDate: number | null
  dueDate: number | null
  url: string
}

const STATUS_LABELS: Record<string, string> = {
  'to do': '대기',
  'in progress': '진행중',
  'blocked': '블록됨',
  'complete': '완료',
}

function fmtDate(ts: number | null): string {
  if (!ts) return '-'
  const d = new Date(ts)
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`
}

function isOverdue(ts: number | null): boolean {
  if (!ts) return false
  return ts < Date.now()
}

type EditingField = { taskId: string; field: 'status' | 'startDate' | 'dueDate' } | null

interface MyTasksModalProps {
  onClose: () => void
}

const STATUSES = ['to do', 'in progress', 'blocked', 'complete']

export default function MyTasksModal({ onClose }: MyTasksModalProps) {
  const { auth } = useChatStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<EditingField>(null)
  const [saving, setSaving] = useState<string | null>(null)

  // 그룹화
  function groupTasks(list: Task[]) {
    const now = Date.now()
    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999)
    const weekEnd    = new Date(todayEnd); weekEnd.setDate(weekEnd.getDate() + 6)

    const overdue:    Task[] = []
    const today:      Task[] = []
    const inProgress: Task[] = []
    const rest:       Task[] = []

    list.forEach(t => {
      const due   = t.dueDate
      const start = t.startDate
      if (t.status === 'complete') return

      if (due && due < todayStart.getTime()) {
        overdue.push(t)
      } else if (due && due >= todayStart.getTime() && due <= todayEnd.getTime()) {
        today.push(t)
      } else {
        // 이번 주 이내: start 또는 due가 오늘~7일 이내
        const dueThisWeek   = due   && due   > todayEnd.getTime() && due   <= weekEnd.getTime()
        const startThisWeek = start && start >= todayStart.getTime() && start <= weekEnd.getTime()
        const alreadyStarted = start && start <= now
        if (dueThisWeek || startThisWeek || alreadyStarted) {
          inProgress.push(t)
        } else {
          rest.push(t)
        }
      }
    })

    return [
      { label: '지연된 작업', emoji: '🔴', tasks: overdue },
      { label: '오늘 마감', emoji: '🟡', tasks: today },
      { label: '진행중 (이번 주)', emoji: '🔵', tasks: inProgress },
      { label: '기타', emoji: '⚪', tasks: rest },
    ].filter(g => g.tasks.length > 0)
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${BASE_URL}/api/my-tasks`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTasks(data.tasks)
    } catch (e: any) {
      setError(e.message || '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }

  async function updateTask(taskId: string, patch: Record<string, any>) {
    setSaving(taskId)
    try {
      const res = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify(patch)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, status: data.task?.status ?? t.status, ...('startDate' in patch ? { startDate: patch.startDate } : {}), ...('dueDate' in patch ? { dueDate: patch.dueDate } : {}) }
          : t
      ))
      setEditing(null)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#1a1d27] border border-[#2e3147] rounded-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e3147] flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white">내 할일</h2>
            <p className="text-xs text-[#4a5060] mt-0.5">{auth.username} · ClickUp 연동</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTasks}
              className="text-[#4a5060] hover:text-[#9aa0b5] transition-colors p-1.5"
              title="새로고침"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 7a6 6 0 1 0 6-6 6 6 0 0 0-4.2 1.7L1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
            <button onClick={onClose} className="text-[#4a5060] hover:text-[#9aa0b5] transition-colors p-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Notice */}
        <div className="mx-5 mt-3 px-3 py-2 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex-shrink-0">
          <p className="text-[11px] text-[#f59e0b]">
            실제 일정과 다를 경우, ClickUp에서 티켓을 업데이트해주세요.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {loading && (
            <div className="text-center py-12 text-sm text-[#4a5060]">
              <div className="w-6 h-6 border-2 border-[#7c6aff]/30 border-t-[#7c6aff] rounded-full animate-spin mx-auto mb-3" />
              불러오는 중...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-sm text-red-400">{error}</div>
          )}

          {!loading && !error && tasks.length === 0 && (
            <div className="text-center py-12 text-sm text-[#4a5060]">
              할당된 태스크가 없습니다.
            </div>
          )}

          {!loading && !error && groupTasks(tasks).map(group => (
            <div key={group.label}>
              {/* Group header */}
              <div className="flex items-center gap-2 px-1 py-2 sticky top-0 bg-[#1a1d27] z-10">
                <span className="text-xs">{group.emoji}</span>
                <span className="text-xs font-semibold text-[#9aa0b5]">{group.label}</span>
                <span className="text-[10px] text-[#4a5060] ml-1">{group.tasks.length}건</span>
              </div>

              <div className="space-y-2 mb-3">
              {group.tasks.map(task => (
            <div key={task.id} className="bg-[#252836] border border-[#2e3147] rounded-xl p-3.5 hover:border-[#3e4157] transition-colors">
              {/* Task name + folder */}
              <div className="flex items-start gap-2 mb-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#e2e4ec] leading-snug">{task.name}</p>
                  <p className="text-[11px] text-[#4a5060] mt-0.5">{task.folder}{task.list ? ` · ${task.list}` : ''}</p>
                </div>
                <a
                  href={task.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4a5060] hover:text-[#7c6aff] flex-shrink-0 mt-0.5"
                  title="ClickUp에서 열기"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7M8 1h3m0 0v3M11 1 5.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>

              {/* Status + Dates row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status */}
                {editing?.taskId === task.id && editing.field === 'status' ? (
                  <select
                    className="text-xs bg-[#1a1d27] border border-[#7c6aff]/40 rounded px-2 py-1 text-[#e2e4ec] focus:outline-none"
                    defaultValue={task.status}
                    onChange={e => updateTask(task.id, { status: e.target.value })}
                    disabled={saving === task.id}
                    autoFocus
                    onBlur={() => setEditing(null)}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
                  </select>
                ) : (
                  <button
                    onClick={() => setEditing({ taskId: task.id, field: 'status' })}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1e2130] border border-[#2e3147] hover:border-[#7c6aff]/40 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.statusColor }} />
                    <span className="text-[11px] text-[#9aa0b5]">
                      {STATUS_LABELS[task.status] || task.status}
                    </span>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-[#4a5060]">
                      <path d="M1.5 3l2.5 2.5L6.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}

                {/* Start Date */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[#4a5060]">시작</span>
                  {editing?.taskId === task.id && editing.field === 'startDate' ? (
                    <input
                      type="date"
                      className="text-xs bg-[#1a1d27] border border-[#7c6aff]/40 rounded px-1.5 py-0.5 text-[#e2e4ec] focus:outline-none"
                      defaultValue={task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : ''}
                      onChange={e => {
                        const ts = e.target.value ? new Date(e.target.value).getTime() : null
                        if (ts) updateTask(task.id, { startDate: ts })
                      }}
                      onBlur={() => setEditing(null)}
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setEditing({ taskId: task.id, field: 'startDate' })}
                      className="text-[11px] text-[#9aa0b5] hover:text-[#7c6aff] px-1.5 py-0.5 rounded border border-transparent hover:border-[#7c6aff]/30 transition-colors"
                    >
                      {fmtDate(task.startDate)}
                    </button>
                  )}
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[#4a5060]">마감</span>
                  {editing?.taskId === task.id && editing.field === 'dueDate' ? (
                    <input
                      type="date"
                      className="text-xs bg-[#1a1d27] border border-[#7c6aff]/40 rounded px-1.5 py-0.5 text-[#e2e4ec] focus:outline-none"
                      defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                      onChange={e => {
                        const ts = e.target.value ? new Date(e.target.value).getTime() : null
                        if (ts) updateTask(task.id, { dueDate: ts })
                      }}
                      onBlur={() => setEditing(null)}
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setEditing({ taskId: task.id, field: 'dueDate' })}
                      className={`text-[11px] px-1.5 py-0.5 rounded border border-transparent hover:border-[#7c6aff]/30 transition-colors ${isOverdue(task.dueDate) ? 'text-red-400 hover:text-red-300' : 'text-[#9aa0b5] hover:text-[#7c6aff]'}`}
                    >
                      {fmtDate(task.dueDate)}
                      {isOverdue(task.dueDate) && <span className="ml-1 text-[9px]">!</span>}
                    </button>
                  )}
                </div>

                {saving === task.id && (
                  <span className="text-[10px] text-[#7c6aff] animate-pulse">저장 중...</span>
                )}
              </div>
            </div>
          ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#2e3147] flex-shrink-0">
          <p className="text-[10px] text-[#4a5060] text-center">
            상태·날짜만 수정 가능 · 삭제 불가 · ClickUp 실시간 반영
          </p>
        </div>
      </div>
    </div>
  )
}
