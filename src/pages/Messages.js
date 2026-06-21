import React, { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthContext } from '../App'

export default function Messages() {
  const session = useContext(AuthContext)
  const navigate = useNavigate()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchThreads() }, [])

  async function fetchThreads() {
    const uid = session.user.id
    const { data } = await supabase
      .from('threads')
      .select('*, parts(title, price, images), buyer:profiles!threads_buyer_id_fkey(id, full_name), seller:profiles!threads_seller_id_fkey(id, full_name)')
      .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
      .order('updated_at', { ascending: false })
    setThreads(data || [])
    setLoading(false)
  }

  function otherUser(t) {
    return t.buyer_id === session.user.id ? t.seller : t.buyer
  }

  function initials(name) {
    return (name || 'U').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Messages</span>
      </div>
      <div className="scroll-area">
        {loading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : threads.length === 0 ? (
          <div className="empty-state">
            <i className="ti ti-message-circle" />
            <p>No conversations yet.<br />Message a seller to get started.</p>
          </div>
        ) : threads.map(t => {
          const other = otherUser(t)
          return (
            <div key={t.id} onClick={() => navigate(`/chat/${t.id}`)}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'0.5px solid var(--border)', cursor:'pointer' }}>
              <div className="avatar" style={{ width:44, height:44, fontSize:15 }}>{initials(other?.full_name)}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:500, fontSize:14 }}>{other?.full_name || 'Unknown'}</div>
                <div style={{ fontSize:12, color:'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {t.parts?.title} · R {Number(t.parts?.price).toLocaleString()}
                </div>
              </div>
              <i className="ti ti-chevron-right" style={{ color:'var(--text-tertiary)', fontSize:16 }} />
            </div>
          )
        })}
      </div>
    </>
  )
}
