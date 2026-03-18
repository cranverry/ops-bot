export type Role = 'owner' | 'admin' | 'member' | 'external'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  streaming?: boolean
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface AuthState {
  authenticated: boolean
  role: Role | null
  token: string | null
}

export interface BufferStatus {
  OAS: number
  MRG: number
  BTQ: number
  threshold: number
}

export interface ChatRequest {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
  role: Role
}
