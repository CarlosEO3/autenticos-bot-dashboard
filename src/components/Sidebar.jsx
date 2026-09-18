import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { LogOut, Bot, UserCog, Bell, Search, Sun, Moon } from 'lucide-react'

export default function Sidebar({ onSelectConversation, selectedConv, onLogout, session, theme, onToggleTheme, pushEnabled, onEnablePush }) {
  const [conversations, setConversations] = useState([])
  const [filterStatus, setFilterStatus] = useState('all') // 'all', 'human_intervention', 'bot_active'
  const [searchQuery, setSearchQuery] = useState('')
  
  const selectedId = selectedConv?.id;

  // Optimistic update for UI sync
  useEffect(() => {
    if (selectedConv) {
      setConversations(prev => prev.map(c => 
        c.id === selectedConv.id ? { ...c, status: selectedConv.status } : c
      ));
    }
  }, [selectedConv]);

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

  const handleToggleFilter = (status) => {
    if (filterStatus === status) {
      setFilterStatus('all');
    } else {
      setFilterStatus(status);
    }
  };

  const humanCount = conversations.filter(c => c.status === 'human_intervention').length;
  const botCount = conversations.filter(c => c.status === 'bot_active').length;

  const filteredConversations = conversations.filter(c => {
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const searchLower = searchQuery.toLowerCase();
    const name = c.user_name ? c.user_name.toLowerCase() : '';
    const phone = c.phone_number ? c.phone_number : '';
    const matchesSearch = name.includes(searchLower) || phone.includes(searchLower);
    
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src={theme === 'light' ? "/logo-azul.png" : "/Logo-Blanco.png"} alt="Auténticos" style={{ height: '32px' }} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="action-btn" onClick={onToggleTheme} title="Cambiar Tema">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button className={`action-btn ${pushEnabled ? 'success' : ''}`} onClick={onEnablePush} title="Activar Notificaciones">
            <Bell size={20} />
          </button>
          <button className="action-btn logout" onClick={onLogout} title="Cerrar Sesión">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="sidebar-stats">
        <div 
          className={`stat-card stat-human ${filterStatus === 'human_intervention' || filterStatus === 'all' ? 'active-filter' : ''}`}
          onClick={() => handleToggleFilter('human_intervention')}
        >
          <div className="stat-label"><div className="dot dot-human"></div>HUMANO</div>
          <div className="stat-value">{humanCount}<span> urgentes</span></div>
        </div>
        <div 
          className={`stat-card stat-bot ${filterStatus === 'bot_active' || filterStatus === 'all' ? 'active-filter' : ''}`}
          onClick={() => handleToggleFilter('bot_active')}
        >
          <div className="stat-label"><div className="dot dot-bot"></div>ACTIVOS</div>
          <div className="stat-value">{botCount}<span> bots</span></div>
        </div>
      </div>
      
      <div className="sidebar-search">
        <Search className="search-icon" size={16} />
        <input 
          type="text" 
          className="search-input" 
          placeholder="Buscar chat o teléfono..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="conv-list">
        {filteredConversations.map(conv => {
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
                    <UserCog size={12} /> Requiere asesor
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
        {filteredConversations.length === 0 && (
          <div style={{padding: '24px', textAlign: 'center', color: 'var(--text-secondary)'}}>
            No hay conversaciones para mostrar.
          </div>
        )}
      </div>
    </div>
  )
}
