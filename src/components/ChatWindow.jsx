import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { CheckCircle, Send, Bot, User, UserCog } from 'lucide-react'

export default function ChatWindow({ conversation, onResolve }) {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (!conversation) return

    fetchMessages()

    const channel = supabase
      .channel(`messages_${conversation.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
    
    if (data) setMessages(data)
  }

  const handleResolve = async () => {
    await supabase
      .from('conversations')
      .update({ status: 'bot_active', updated_at: new Date().toISOString() })
      .eq('id', conversation.id)
    
    onResolve()
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || sending) return
    
    setSending(true)
    const textToSend = inputValue.trim()
    setInputValue('') // optimistic clear

    try {
      // Optimistic UI update
      const tempId = 'temp-' + Date.now()
      setMessages(prev => [...prev, {
        id: tempId,
        conversation_id: conversation.id,
        sender_role: 'human',
        content: textToSend,
        created_at: new Date().toISOString()
      }])

      const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
      const res = await fetch(`${apiUrl}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          phoneNumber: conversation.phone_number,
          content: textToSend
        })
      })

      if (!res.ok) {
        throw new Error('Failed to send message')
      }
    } catch (err) {
      console.error(err)
      alert("Error al enviar el mensaje")
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => !m.id?.toString().startsWith('temp-')))
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!conversation) {
    return (
      <div className="chat-empty">
        <div className="chat-empty-message">
          Selecciona un chat en la barra lateral para ver los mensajes.
        </div>
      </div>
    )
  }

  const isHuman = conversation.status === 'human_intervention';

  return (
    <div className="chat-window">
      {/* Banner de Estado para modo "Humano" */}
      {isHuman && (
        <div className="chat-banner-human">
          <div className="banner-content">
            <div className="icon-container">
              <Bot size={24} />
            </div>
            <div>
              <strong style={{display: 'block', fontSize: '13px', color: 'var(--text-secondary)'}}>MODO OPERATIVO</strong>
              <span style={{fontSize: '18px', fontWeight: 'bold'}}>Bot: Pausado</span>
            </div>
          </div>
          <button className="resolve-btn" onClick={handleResolve}>
            <CheckCircle size={18} />
            Reanudar Bot
          </button>
        </div>
      )}

      {/* Cabecera del Chat */}
      <div className="chat-header">
        <div className="avatar">
          {conversation.user_name ? conversation.user_name.substring(0, 2).toUpperCase() : 'U'}
        </div>
        <div>
          <h3 style={{margin: 0}}>{conversation.user_name || 'Usuario'}</h3>
          <span style={{color: 'var(--text-secondary)', fontSize: '13px'}}>{conversation.phone_number}</span>
        </div>
      </div>

      {/* Lista de Mensajes */}
      <div className="chat-messages">
        {messages.map((msg) => {
          const isRight = msg.sender_role === 'bot' || msg.sender_role === 'human'
          const roleClass = msg.sender_role === 'bot' ? 'message-bot' : 
                            msg.sender_role === 'human' ? 'message-human' : 'message-left'
                            
          return (
            <div key={msg.id} className={`message-wrapper ${isRight ? 'right' : 'left'}`}>
              <div className="message-meta">
                <span>{msg.sender_role === 'bot' ? 'Auténticos AI' : msg.sender_role === 'human' ? 'Asesor (Tú)' : conversation.user_name}</span>
                <span style={{opacity: 0.5}}>• {formatTime(msg.created_at)}</span>
              </div>
              <div className={`message-bubble ${roleClass}`}>
                {msg.content}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer - Input (RelayBot Style) */}
      <form className="chat-input-container" onSubmit={handleSendMessage}>
        <div className="chat-input-wrapper">
          <input 
            type="text" 
            className="chat-input"
            placeholder={isHuman ? "Escribe un mensaje como agente..." : "El bot está gestionando la conversación..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={sending}
          />
        </div>
        <button type="submit" className="send-btn" disabled={!inputValue.trim() || sending}>
          <Send size={20} color="#001d2d" />
        </button>
      </form>
    </div>
  )
}
