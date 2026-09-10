import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { LogOut, Bot, UserCog } from 'lucide-react'

export default function Sidebar({ onSelectConversation, selectedId, onLogout }) {
  const [conversations, setConversations] = useState([])

  useEffect(() => {
    fetchConversations()

    const channel = supabase
      .channel('conversations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchConversations()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false })

    if (data) setConversations(data)
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    return name.substring(0, 2).toUpperCase()
  }

  const humanCount = conversations.filter(c => c.status === 'human_intervention').length;
  const botCount = conversations.filter(c => c.status === 'bot_active').length;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src="/Logo-Blanco.png" alt="Auténticos" style={{ height: '32px' }} />
        <button className="logout-btn" onClick={onLogout} title="Cerrar Sesión">
          <LogOut size={20} />
        </button>
      </div>

      <div className="sidebar-stats">
        <div className="stat-card stat-human">
          <div className="stat-label"><div className="dot dot-human"></div>HUMANO</div>
          <div className="stat-value">{humanCount}<span> urgentes</span></div>
        </div>
        <div className="stat-card stat-bot">
          <div className="stat-label"><div className="dot dot-bot"></div>ACTIVOS</div>
          <div className="stat-value">{botCount}<span> bots</span></div>
        </div>
      </div>
      
      <div className="conv-list">
        {conversations.map(conv => {
          const isHuman = conv.status === 'human_intervention';
          
          return (
            <div 
              key={conv.id} 
              className={`conv-item ${selectedId === conv.id ? 'active' : ''} ${isHuman ? 'human-active' : 'bot-active'}`}
              onClick={() => onSelectConversation(conv)}
            >
              <div className="conv-header">
                <div className="avatar">
                  {getInitials(conv.user_name)}
                  {!isHuman && <div className="online-dot"></div>}
                </div>
                
                <div className="conv-info">
                  <span className="conv-name">{conv.user_name || 'Usuario'}</span>
                  <span className="conv-phone">{conv.phone_number}</span>
                </div>
              </div>

              <div className="conv-badges">
                {isHuman ? (
                  <span className="badge badge-human">
                    <UserCog size={12} /> Handover Solicitado
                  </span>
                ) : (
                  <span className="badge badge-bot">
                    <Bot size={12} /> Bot Activo
                  </span>
                )}
              </div>

              {isHuman && (
                <button className="take-chat-btn" onClick={(e) => {
                  e.stopPropagation();
                  onSelectConversation(conv);
                }}>
                  <UserCog size={16} /> Tomar Chat
                </button>
              )}
            </div>
          )
        })}
        {conversations.length === 0 && (
          <div style={{padding: '24px', textAlign: 'center', color: 'var(--text-secondary)'}}>
            No hay conversaciones aún.
          </div>
        )}
      </div>
    </div>
  )
}
