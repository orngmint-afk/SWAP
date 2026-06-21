import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Browse from './pages/Browse'
import PartDetail from './pages/PartDetail'
import ListPart from './pages/ListPart'
import Messages from './pages/Messages'
import Chat from './pages/Chat'
import Profile from './pages/Profile'
import Auth from './pages/Auth'

export const AuthContext = React.createContext(null)

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={session}>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/" />} />
          <Route element={session ? <Layout /> : <Navigate to="/auth" />}>
            <Route index element={<Browse />} />
            <Route path="/part/:id" element={<PartDetail />} />
            <Route path="/list" element={<ListPart />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/chat/:threadId" element={<Chat />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
