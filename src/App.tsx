import { useEffect, useState } from 'react'
import { useChatStore } from './stores/chatStore'
import LoginScreen from './components/LoginScreen'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import FaqPanel from './components/FaqPanel'

export default function App() {
  const { auth, createSession, activeSessionId, sidebarOpen, setSidebarOpen } = useChatStore()
  const [faqOpen, setFaqOpen] = useState(false)

  useEffect(() => {
    if (auth.authenticated && !activeSessionId) {
      createSession()
    }
  }, [auth.authenticated, activeSessionId, createSession])

  if (!auth.authenticated) {
    return <LoginScreen />
  }

  return (
    <div className="flex h-full bg-[#0f1117] overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div
        className={`
          fixed md:relative z-30 md:z-auto h-full
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar />
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* FAQ Toggle Button */}
        <button
          onClick={() => setFaqOpen(!faqOpen)}
          className={`
            absolute top-4 right-4 z-10
            flex items-center gap-1.5 px-3 py-1.5
            rounded-lg border text-xs font-medium
            transition-all duration-200
            ${faqOpen
              ? 'bg-[#7c6aff]/20 border-[#7c6aff]/40 text-[#a59aff]'
              : 'bg-[#1e2130] border-[#2e3147] text-[#6b7280] hover:text-[#9aa0b5] hover:border-[#3e4157]'
            }
          `}
          title="사용 가이드"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="5" r="1.8" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M1.5 11c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          가이드
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${faqOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 12 12" fill="none"
          >
            <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <ChatWindow />
      </div>

      {/* Right FAQ Panel */}
      {faqOpen && (
        <div className="hidden lg:flex">
          <FaqPanel open={faqOpen} onClose={() => setFaqOpen(false)} />
        </div>
      )}

      {/* Mobile FAQ Panel */}
      <FaqPanel open={faqOpen && window.innerWidth < 1024} onClose={() => setFaqOpen(false)} />
    </div>
  )
}
