import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [selectedConv, setSelectedConv] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSelectedConv(null)
  }

  if (loading) return null

  if (!session) {
    return <Login onLogin={setSession} />
  }

  return (
    <div className={`app-container ${selectedConv ? 'chat-active' : ''}`}>
      <Sidebar 
        onSelectConversation={setSelectedConv} 
        selectedId={selectedConv?.id} 
        onLogout={handleLogout}
        session={session}
      />
      <ChatWindow 
        conversation={selectedConv} 
        onResolve={() => {
          setSelectedConv(prev => ({...prev, status: 'bot_active'}))
        }}
        onBack={() => setSelectedConv(null)}
      />
    </div>
  )
}

export default App
