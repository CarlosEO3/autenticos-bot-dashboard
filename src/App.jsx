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
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [pushEnabled, setPushEnabled] = useState(false)

  useEffect(() => {
    document.documentElement.className = theme === 'light' ? 'theme-light' : ''
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      checkPushSubscription()
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkPushSubscription()
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkPushSubscription = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        let registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          registration = await navigator.serviceWorker.register('/sw.js');
        }
        const readyRegistration = await navigator.serviceWorker.ready;
        const subscription = await readyRegistration.pushManager.getSubscription();
        setPushEnabled(!!subscription);
      } catch (e) {
        console.error('Error checking push subscription', e);
      }
    }
  }

  const urlB64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const enablePush = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        let swRegistration = await navigator.serviceWorker.getRegistration();
        if (!swRegistration) {
          swRegistration = await navigator.serviceWorker.register('/sw.js');
        }
        swRegistration = await navigator.serviceWorker.ready;
        
        const subscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array('BCUss9mxxITm3aUobQgge66_muldGESfGzHMUNg_RMDvxT-URj4oAnliqRsZzYoraL3WHih1TbVprZNtJPn8j64')
        });
        
        const { data: existingSubs } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', session?.user?.id);
        
        const isDuplicate = existingSubs?.some(sub => sub.subscription.endpoint === subscription.endpoint);

        if (!isDuplicate) {
          await supabase.from('push_subscriptions').insert({
            user_id: session?.user?.id,
            subscription: subscription
          });
        }
        
        setPushEnabled(true);
        alert('¡Notificaciones activadas exitosamente!');
      } catch (e) {
        console.error('Error enabling push', e);
        alert('No se pudieron activar las notificaciones. Asegúrate de dar permisos en tu navegador (o añade la app a la pantalla de inicio en iOS).');
      }
    } else {
      alert('Tu navegador/dispositivo no soporta notificaciones push en este momento.');
    }
  }

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
        selectedConv={selectedConv} 
        onLogout={handleLogout}
        session={session}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
        pushEnabled={pushEnabled}
        onEnablePush={enablePush}
      />
      <ChatWindow 
        conversation={selectedConv} 
        onResolve={() => {
          setSelectedConv(prev => ({...prev, status: 'bot_active'}))
        }}
        onBack={() => setSelectedConv(null)}
        pushEnabled={pushEnabled}
        onEnablePush={enablePush}
      />
    </div>
  )
}

export default App
