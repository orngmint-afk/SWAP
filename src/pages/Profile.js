import React, { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthContext } from '../App'

export default function Profile() {
  const { userId } = useParams()
  const session = useContext(AuthContext)
  const navigate = useNavigate()
  const targetId = userId || session?.user?.id
  const isOwn = !userId || userId === session?.user?.id

  const [profile, setProfile] = useState(null)
  const [parts, setParts] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRateModal, setShowRateModal] = useState(false)
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')
  const [alreadyRated, setAlreadyRated] = useState(false)

  useEffect(() => { fetchProfile() }, [targetId])

  async function fetchProfile() {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', targetId).single()
    setProfile(p)
    const { data: listings } = await supabase.from('parts').select('*').eq('user_id', targetId).order('created_at', { ascending: false })
    setParts(listings || [])
    const { data: r } = await supabase.from('reviews').select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name)').eq('seller_id', targetId).order('created_at', { ascending: false })
    setReviews(r || [])
    if (session && !isOwn) {
      const { data: existing } = await supabase.from('reviews').select('id').eq('seller_id', targetId).eq('reviewer_id', session.user.id).single()
      if (existing) setAlreadyRated(true)
    }
    setLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function submitRating() {
    if (!rating) { showToast('Please select a star rating'); return }
    setSubmitting(true)
    const { error } = await supabase.from('reviews').insert({
      seller_id: targetId,
      reviewer_id: session.user.id,
      rating,
      comment: reviewText.trim()
    })
    if (error) { showToast('Error submitting review'); setSubmitting(false); return }

    // Recalculate avg rating and sale count
    const { data: allReviews } = await supabase.from('reviews').select('rating').eq('seller_id', targetId)
    const avg = allReviews.reduce((a, r) => a + r.rating, 0) / allReviews.length
    await supabase.from('profiles').update({ avg_rating: avg, sale_count: allReviews.length }).eq('id', targetId)

    setSubmitting(false)
    setShowRateModal(false)
    setAlreadyRated(true)
    setRating(0)
    setReviewText('')
    showToast('Review submitted!')
    fetchProfile()
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  function initials(name) {
    return (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  function StarRow({ value, interactive = false, size = 20 }) {
    return (
      <div style={{ display: 'flex', gap: 2 }}>
        {[1,2,3,4,5].map(i => (
          <i
            key={i}
            className={`ti ti-star${(interactive ? (hovered || rating) : value) >= i ? '-filled' : ''}`}
            style={{ fontSize: size, color: '#BA7517', cursor: interactive ? 'pointer' : 'default' }}
            onMouseEnter={() => interactive && setHovered(i)}
            onMouseLeave={() => interactive && setHovered(0)}
            onClick={() => interactive && setRating(i)}
          />
        ))}
      </div>
    )
  }

  if (loading) return (
    <>
      <div className="topbar"><span className="topbar-title">Profile</span></div>
      <div className="empty-state"><div className="spinner" /></div>
    </>
  )

  return (
    <>
      <div className="topbar">
        {!isOwn && <button className="icon-btn" onClick={() => navigate(-1)}><i className="ti ti-arrow-left" /></button>}
        <span className="topbar-title">{isOwn ? 'My profile' : 'Seller profile'}</span>
        {isOwn && <button className="icon-btn" onClick={signOut} aria-label="Sign out"><i className="ti ti-logout" /></button>}
      </div>

      <div className="scroll-area">
        {/* Header */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, paddingBottom:20, borderBottom:'0.5px solid var(--border)', marginBottom:16 }}>
          <div className="avatar" style={{ width:64, height:64, fontSize:20 }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} />
              : initials(profile?.full_name)
            }
          </div>
          <div style={{ fontWeight:600, fontSize:18 }}>{profile?.full_name || 'Unknown'}</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <StarRow value={profile?.avg_rating || 0} size={16} />
            <span style={{ fontSize:13, color:'var(--text-secondary)' }}>
              {(profile?.avg_rating || 0).toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display:'flex', gap:24 }}>
            {[
              { n: parts.filter(p=>!p.sold).length, l:'Active'},
              { n: parts.filter(p=>p.sold).length, l:'Sold' },
              { n: reviews.length, l:'Reviews' }
            ].map(({n,l}) => (
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontSize:18, fontWeight:600 }}>{n}</div>
                <div style={{ fontSize:11, color:'var(--text-tertiary)' }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Rate button — only show if viewing someone else's profile */}
          {!isOwn && session && (
            <button
              className={alreadyRated ? 'btn-secondary' : 'btn-primary'}
              style={{ width:'auto', padding:'9px 20px', marginTop:4 }}
              onClick={() => !alreadyRated && setShowRateModal(true)}
              disabled={alreadyRated}
            >
              <i className={`ti ti-star${alreadyRated ? '-filled' : ''}`} />
              {alreadyRated ? 'Already rated' : 'Rate this seller'}
            </button>
          )}
        </div>

        {/* Listings */}
        <div className="section-label">Listings</div>
        {parts.length === 0
          ? <div className="empty-state"><i className="ti ti-package" /><p>No listings yet.</p>
              {isOwn && <button className="btn-primary" style={{ width:'auto', padding:'10px 20px' }} onClick={() => navigate('/list')}>List a part</button>}
            </div>
          : parts.map(p => (
            <Link key={p.id} to={`/part/${p.id}`} className="part-card" style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div className="part-thumb" style={{ width:48, height:48, fontSize:20 }}>
                {p.images?.[0] ? <img src={p.images[0]} alt={p.title} /> : <i className="ti ti-engine" />}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div className="part-name">{p.title}</div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--red)' }}>R {Number(p.price).toLocaleString()}</div>
              </div>
              {p.sold && <span className="badge" style={{ background:'#eee', color:'#666' }}>Sold</span>}
            </Link>
          ))
        }

        {/* Reviews */}
        {reviews.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop:20 }}>Reviews</div>
            {reviews.map(r => (
              <div key={r.id} style={{ padding:'12px 0', borderBottom:'0.5px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <div className="avatar" style={{ width:32, height:32, fontSize:11 }}>{initials(r.reviewer?.full_name)}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{r.reviewer?.full_name}</div>
                    <StarRow value={r.rating} size={12} />
                  </div>
                </div>
                {r.comment && <p style={{ fontSize:13, color:'var(--text-secondary)', marginLeft:40 }}>{r.comment}</p>}
              </div>
            ))}
          </>
        )}

        <div style={{ height:14 }} />
      </div>

      {/* Rate modal */}
      {showRateModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:50, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div style={{ background:'var(--bg)', borderRadius:'20px 20px 0 0', padding:'24px 20px 32px', width:'100%', maxWidth:480 }}>
            <h3 style={{ marginBottom:4 }}>Rate {profile?.full_name}</h3>
            <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>How was your experience with this seller?</p>

            <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
              <StarRow value={rating} interactive size={36} />
            </div>

            <div className="form-group">
              <label className="form-label">Leave a comment (optional)</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Describe your experience…"
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
              />
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-secondary" style={{ flex:1 }} onClick={() => setShowRateModal(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex:2 }} onClick={submitRating} disabled={submitting}>
                {submitting ? <div className="spinner" style={{ borderTopColor:'#fff', width:18, height:18 }} /> : 'Submit review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
