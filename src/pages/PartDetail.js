import React, { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthContext } from '../App'

function condBadge(cond) {
  const map = { New: 'badge-new', Good: 'badge-good', Fair: 'badge-fair' }
  return `badge ${map[cond] || 'badge-fair'}`
}

function Stars({ rating }) {
  return (
    <span className="stars">
      {[1,2,3,4,5].map(i => (
        <i key={i} className={`ti ti-star${i <= Math.round(rating) ? '-filled' : ''}`} style={{ fontSize: 13 }} aria-hidden="true" />
      ))}
    </span>
  )
}

export default function PartDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const session = useContext(AuthContext)
  const [part, setPart] = useState(null)
  const [seller, setSeller] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)
  const [toast, setToast] = useState('')

  useEffect(() => { fetchPart() }, [id])

  async function fetchPart() {
    const { data } = await supabase.from('parts').select('*').eq('id', id).single()
    if (data) {
      setPart(data)
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user_id).single()
      setSeller(profile)
    }
    setLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function toggleSave() {
    setSaved(s => !s)
    showToast(saved ? 'Removed from saved' : 'Saved')
  }

  async function startChat() {
    if (!session) return navigate('/auth')
    if (part.user_id === session.user.id) {
      showToast("That's your own listing")
      return
    }
    // Find or create a thread between these two users for this part
    const { data: existing } = await supabase
      .from('threads')
      .select('id')
      .eq('part_id', id)
      .eq('buyer_id', session.user.id)
      .single()

    if (existing) {
      navigate(`/chat/${existing.id}`)
    } else {
      const { data: thread } = await supabase
        .from('threads')
        .insert({ part_id: id, buyer_id: session.user.id, seller_id: part.user_id })
        .select()
        .single()
      if (thread) navigate(`/chat/${thread.id}`)
    }
  }

  if (loading) return (
    <div className="app-shell">
      <div className="empty-state" style={{ marginTop: 80 }}><div className="spinner" /></div>
    </div>
  )

  if (!part) return (
    <div className="app-shell">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate(-1)}><i className="ti ti-arrow-left" /></button>
      </div>
      <div className="empty-state"><i className="ti ti-alert-circle" /><p>Listing not found.</p></div>
    </div>
  )

  const images = part.images?.length ? part.images : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <i className="ti ti-arrow-left" aria-hidden="true" />
        </button>
        <span className="topbar-title">Part details</span>
        <button className="icon-btn" onClick={toggleSave} aria-label={saved ? 'Unsave' : 'Save'}>
          <i className={`ti ti-heart${saved ? '-filled' : ''}`} style={{ color: saved ? 'var(--red)' : undefined }} aria-hidden="true" />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {/* Image */}
        <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          {images ? (
            <>
              <img src={images[imgIdx]} alt={part.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {images.length > 1 && (
                <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setImgIdx(i)} style={{ width: 6, height: 6, borderRadius: '50%', background: i === imgIdx ? '#fff' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', padding: 0 }} aria-label={`Image ${i+1}`} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <i className="ti ti-engine" style={{ fontSize: 56, color: 'var(--text-tertiary)' }} aria-hidden="true" />
          )}
        </div>

        <div style={{ padding: '16px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <h2 style={{ flex: 1, marginRight: 8 }}>{part.title}</h2>
            <span className={condBadge(part.condition)}>{part.condition}</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--red)', marginBottom: 14 }}>
            R {Number(part.price).toLocaleString()}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Fits', val: part.fits },
              { label: 'Location', val: part.location },
              { label: 'Category', val: part.category },
              { label: 'Part number', val: part.part_number || '—' },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{val}</div>
              </div>
            ))}
          </div>

          {part.description && (
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
              {part.description}
            </p>
          )}

          {/* Seller */}
          {seller && (
            <button
              onClick={() => navigate(`/profile/${seller.id}`)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer', marginBottom: 16, textAlign: 'left' }}
            >
              <div className="avatar" style={{ width: 44, height: 44 }}>
                {seller.avatar_url
                  ? <img src={seller.avatar_url} alt={seller.full_name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  : (seller.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{seller.full_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Stars rating={seller.avg_rating || 0} />
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{seller.sale_count || 0} sales</span>
                </div>
              </div>
              <i className="ti ti-chevron-right" style={{ color: 'var(--text-tertiary)', fontSize: 18 }} aria-hidden="true" />
            </button>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={startChat}>
              <i className="ti ti-message-circle" aria-hidden="true" />
              Message seller
            </button>
            <button className="btn-secondary" onClick={toggleSave} aria-label={saved ? 'Unsave' : 'Save'}>
              <i className={`ti ti-heart${saved ? '-filled' : ''}`} style={{ color: saved ? 'var(--red)' : undefined }} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
