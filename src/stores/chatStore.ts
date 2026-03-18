import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Message, ChatSession, AuthState, Role } from '../types'

interface ChatStore {
  // Auth
  auth: AuthState
  login: (role: Role, token: string) => void
  logout: () => void

  // Sessions
  sessions: ChatSession[]
  activeSessionId: string | null
  createSession: () => string
  setActiveSession: (id: string) => void
  deleteSession: (id: string) => void
  getActiveSession: () => ChatSession | null

  // Messages
  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => string
  updateMessage: (sessionId: string, messageId: string, content: string, streaming?: boolean) => void
  clearMessages: (sessionId: string) => void

  // UI state
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function generateTitle(messages: Message[]): string {
  const firstUser = messages.find(m => m.role === 'user')
  if (!firstUser) return '새 대화'
  return firstUser.content.slice(0, 30) + (firstUser.content.length > 30 ? '...' : '')
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      auth: {
        authenticated: false,
        role: null,
        token: null,
      },

      login: (role, token) =>
        set({ auth: { authenticated: true, role, token } }),

      logout: () =>
        set({ auth: { authenticated: false, role: null, token: null } }),

      sessions: [],
      activeSessionId: null,

      createSession: () => {
        const id = generateId()
        const newSession: ChatSession = {
          id,
          title: '새 대화',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set(state => ({
          sessions: [newSession, ...state.sessions],
          activeSessionId: id,
        }))
        return id
      },

      setActiveSession: (id) => set({ activeSessionId: id }),

      deleteSession: (id) =>
        set(state => {
          const filtered = state.sessions.filter(s => s.id !== id)
          const newActive =
            state.activeSessionId === id
              ? (filtered[0]?.id ?? null)
              : state.activeSessionId
          return { sessions: filtered, activeSessionId: newActive }
        }),

      getActiveSession: () => {
        const { sessions, activeSessionId } = get()
        return sessions.find(s => s.id === activeSessionId) ?? null
      },

      addMessage: (sessionId, message) => {
        const id = generateId()
        const newMessage: Message = {
          ...message,
          id,
          timestamp: Date.now(),
        }
        set(state => ({
          sessions: state.sessions.map(s => {
            if (s.id !== sessionId) return s
            const updated = { ...s, messages: [...s.messages, newMessage], updatedAt: Date.now() }
            updated.title = generateTitle(updated.messages)
            return updated
          }),
        }))
        return id
      },

      updateMessage: (sessionId, messageId, content, streaming) =>
        set(state => ({
          sessions: state.sessions.map(s => {
            if (s.id !== sessionId) return s
            return {
              ...s,
              messages: s.messages.map(m =>
                m.id === messageId ? { ...m, content, streaming: streaming ?? false } : m
              ),
              updatedAt: Date.now(),
            }
          }),
        })),

      clearMessages: (sessionId) =>
        set(state => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId ? { ...s, messages: [], updatedAt: Date.now() } : s
          ),
        })),

      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: 'opsbot-store',
      partialize: (state) => ({
        auth: state.auth,
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
)
