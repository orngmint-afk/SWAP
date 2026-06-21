import React, { useState, useContext, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthContext } from '../App'

const CATEGORIES = ['Engine', 'Brakes', 'Suspension', 'Body', 'Electrical', 'Exhaust', 'Other']
const CONDITIONS = ['New', 'Good', 'Fair']

export default function ListPart() {
  const session = useContext(AuthContext)
  const navigate = useNavigate()
  const fileRef = useRef()

  const [form, setForm] = useState({
    title: '', category: 'Engine', condition: 'Good',
    price: '', fits: '', part_number: '', location: '', description: ''
  })
  const [images, setImages] = useState([]) // preview URLs
  const [imageFiles, setImageFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function handleImages(e) {
    const files = Array.from(e.target.files).slice(0, 6)
    setImageFiles(files)
    setImages(files.map(f => URL.createObjectURL(f)))
  }

  async function uploadImages() {
    const urls = []
    for (const file of imageFiles) {
      const path = `${session.user.id}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('part-images').upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from('part-images').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    return urls
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.price || !form.location) {
      setError('Please fill in title, price, and location.')
      return
    }
    setLoading(true)
    setError('')

    const imageUrls = imageFiles.length ? await uploadImages() : []

    const { error } = await supabase.from('parts').insert({
      ...form,
      price: parseFloat(form.price),
      images: imageUrls,
      user_id: session.user.id,
      sold: false
    })

    setLoading(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <i className="ti ti-arrow-left" aria-hidden="true" />
        </button>
        <span className="topbar-title">List a part</span>
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 32px' }}>
        {/* Photo upload */}
        <div className="form-group">
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImages} />
          {images.length === 0 ? (
            <div className="photo-upload-box" onClick={() => fileRef.current.click()}>
              <i className="ti ti-camera" aria-hidden="true" />
              <span>Add photos (up to 6)</span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {images.map((src, i) => (
                <img key={i} src={src} alt={`preview ${i+1}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border)' }} />
              ))}
              <button type="button" onClick={() => fileRef.current.click()} style={{ width: 72, height: 72, border: '1.5px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: 22, color: 'var(--text-tertiary)' }}>
                <i className="ti ti-plus" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Part name *</label>
          <input className="form-input" type="text" placeholder="e.g. Toyota Hilux 2.4 Alternator" value={form.title} onChange={e => set('title', e.target.value)} required />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Condition</label>
            <select className="form-select" value={form.condition} onChange={e => set('condition', e.target.value)}>
              {CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Price (ZAR) *</label>
          <input className="form-input" type="number" placeholder="0" min="0" value={form.price} onChange={e => set('price', e.target.value)} required />
        </div>

        <div className="form-group">
          <label className="form-label">Fits (make, model, year range)</label>
          <input className="form-input" type="text" placeholder="e.g. Toyota Hilux 2016–2022" value={form.fits} onChange={e => set('fits', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Part number</label>
          <input className="form-input" type="text" placeholder="e.g. 27060-0L040" value={form.part_number} onChange={e => set('part_number', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Location *</label>
          <input className="form-input" type="text" placeholder="e.g. Sandton, Johannesburg" value={form.location} onChange={e => set('location', e.target.value)} required />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-textarea" rows={4} placeholder="Describe the condition, mileage, fitment notes, collection terms…" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#FCEBEB', borderRadius: 'var(--radius-md)', marginBottom: 14, fontSize: 13, color: '#A32D2D' }}>
            {error}
          </div>
        )}

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading
            ? <><div className="spinner" style={{ borderTopColor: '#fff', width: 18, height: 18 }} /> Uploading…</>
            : <><i className="ti ti-check" aria-hidden="true" /> Publish listing</>
          }
        </button>
      </form>
    </div>
  )
}
