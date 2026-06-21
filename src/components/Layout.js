import React from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'

export default function Layout() {
  const location = useLocation()
  const hideNav = location.pathname.startsWith('/chat/') || location.pathname.startsWith('/part/') || location.pathname === '/list'

  return (
    <div className="app-shell">
      <Outlet />
      {!hideNav && (
        <nav className="bottom-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <i className="ti ti-search" aria-hidden="true" />
            Browse
          </NavLink>
          <NavLink to="/messages" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <i className="ti ti-message-circle" aria-hidden="true" />
            Messages
          </NavLink>
          <NavLink to="/list" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <i className="ti ti-plus-circle" aria-hidden="true" />
            Sell
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <i className="ti ti-user" aria-hidden="true" />
            Profile
          </NavLink>
        </nav>
      )}
    </div>
  )
}
