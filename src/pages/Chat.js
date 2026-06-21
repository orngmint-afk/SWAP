import React, { useState, useEffect, useContext, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthContext } from '../App'

export default function Chat() {
  const { threadId } = useParams()
  const session = useContext(AuthContext)
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [thread, setThread] = useState(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef()

  useEffect(() => {
    fetchThread()
    fetchMessages()

    // Real-time subscription for both buyer and seller
    const channel = supabase
      .channel(`room-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`
        },
        (payload) => {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.find(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [threadId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchThread() {
    const { data } = await supabase
      .from('threads')
      .select('*, parts(title, price), buyer:profiles!threads_buyer_id_fkey(id, full_name), seller:profiles!threads_seller_id_fkey(id, full_name)')
      .eq('id', threadId).single()
    setThread(data)
  }

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at')
    setMessages(data || [])
    setLoading(false)
  }

  async function sendMessage() {
    const t = text.trim()
    if (!t) return
    setText('')
    await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: session.user.id,
      content: t
    })
    await supabase.from('threads').update({
      updated_at: new Date().toISOString()
    }).eq('id', threadId)
  }

  function otherUser() {
    if (!thread) return null
    return thread.buyer_id === session.user.id ? thread.seller : thread.buyer
  }

  const other = otherUser()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate('/messages')} aria-label="Back">
          <i className="ti ti-arrow-left" />
        </button>
        <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
          {(other?.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{other?.full_name || '…'}</div>
          {thread?.parts && (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {thread.parts.title} · R {Number(thread.parts.price).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading
          ? <div className="empty-state"><div className="spinner" /></div>
          : messages.length === 0
          ? <div className="empty-state"><i className="ti ti-message-circle" /><p>Start the conversation</p></div>
          : messages.map(m => (
            <div key={m.id} className={`bubble ${m.sender_id === session.user.id ? 'me' : 'them'}`}>
              {m.content}
            </div>
          ))
        }
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '10px 12px', display: 'flex', gap: 8, borderTop: '0.5px solid var(--border)', background: 'var(--bg)' }}>
        <input
          style={{ flex: 1, fontSize: 14, padding: '9px 14px', borderRadius: 99, border: '0.5px solid var(--border-strong)', background: 'var(--bg-secondary)', color: 'var(--text)', outline: 'none' }}
          placeholder="Type a message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--red)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <i className="ti ti-send" />
        </button>
      </div>
    </div>
  )
}
