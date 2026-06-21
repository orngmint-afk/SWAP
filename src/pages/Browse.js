import React, { useState, useEffect, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthContext } from '../App'

const CATEGORIES = ['All', 'Engine', 'Brakes', 'Suspension', 'Body', 'Electrical', 'Exhaust', 'Other']

function condBadge(cond) {
  const map = { New: 'badge-new', Good: 'badge-good', Fair: 'badge-fair' }
  return `badge ${map[cond] || 'badge-fair'}`
}

function PartCard({ part }) {
  return (
    <Link to={`/part/${part.id}`} className="part-card">
      <div className="part-card-inner">
        <div className="part-thumb">
          {part.images?.[0]
            ? <img src={part.images[0]} alt={part.title} />
            : <i className="ti ti-engine" aria-hidden="true" />}
        </div>
        <div className="part-info">
          <div className="part-name">{part.title}</div>
          <div className="part-sub">{part.fits} · {part.part_number || ''}</div>
          <span className={condBadge(part.condition)}>{part.condition}</span>
        </div>
      </div>
      <div className="part-footer">
        <span className="part-price">R {Number(part.price).toLocaleString()}</span>
        <span className="part-loc">
          <i className="ti ti-map-pin" aria-hidden="true" style={{ fontSize: 12 }} />
          {part.location}
        </span>
      </div>
    </Link>
  )
}

export default function Browse() {
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const navigate = useNavigate()

  useEffect(() => {
    fetchParts()
  }, [category])

  async function fetchParts() {
    setLoading(true)
    let query = supabase
      .from('parts')
      .select('*')
      .eq('sold', false)
      .order('created_at', { ascending: false })

    if (category !== 'All') query = query.eq('category', category)

    const { data, error } = await query
    if (!error) setParts(data || [])
    setLoading(false)
  }

  const filtered = parts.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.fits || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="topbar">
        <span className="topbar-logo">SWA<span>P</span></span>
        <button className="icon-btn" aria-label="Notifications">
          <i className="ti ti-bell" aria-hidden="true" />
        </button>
      </div>

      <div className="scroll-area">
        <div className="search-row">
          <div className="search-wrap">
            <i className="ti ti-search" aria-hidden="true" />
            <input
              className="search-input"
              type="search"
              placeholder="Search parts, make, model…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="chips">
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`chip${category === c ? ' active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <i className="ti ti-tool" aria-hidden="true" />
            <p>No parts found.<br />Be the first to list one.</p>
            <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => navigate('/list')}>
              List a part
            </button>
          </div>
        ) : (
          <>
            <div className="section-label">{filtered.length} listing{filtered.length !== 1 ? 's' : ''}</div>
            {filtered.map(p => <PartCard key={p.id} part={p} />)}
          </>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 72, right: 16, zIndex: 15 }}>
        <button
          onClick={() => navigate('/list')}
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--red)', color: '#fff',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, boxShadow: '0 4px 14px rgba(226,75,74,0.4)'
          }}
          aria-label="List a part"
        >
          <i className="ti ti-plus" aria-hidden="true" />
        </button>
      </div>
    </>
  )
}
