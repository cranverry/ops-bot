import { useEffect } from 'react'
import { useChatStore } from './stores/chatStore'
import LoginScreen from './components/LoginScreen'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'

export default function App() {
  const { auth, createSession, activeSessionId, sidebarOpen, setSidebarOpen } = useChatStore()

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
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed md:relative z-30 md:z-auto h-full
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <ChatWindow />
      </div>
    </div>
  )
}
