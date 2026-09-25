import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import Footer from './Footer'
import NotificationToasts from './NotificationToasts'

// Tailwind's lg breakpoint. Below it the sidebar is an overlay drawer, hidden
// by default; from lg up it's the usual open sidebar / collapsed rail.
const DESKTOP = '(min-width: 64rem)'

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia(DESKTOP).matches)

  // Crossing the breakpoint resets the sidebar: open on desktop, closed on mobile.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP)
    const sync = () => setSidebarOpen(mq.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // The drawer's close button, its links and the backdrop all close it on
  // mobile; on desktop the sidebar stays as the user left it.
  const closeOnMobile = () => {
    if (!window.matchMedia(DESKTOP).matches) setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <NotificationToasts />
      <Sidebar isOpen={sidebarOpen} onClose={closeOnMobile} />
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-gray-900/20 lg:hidden" onClick={closeOnMobile} aria-hidden="true" />
      )}
      <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
        <Navbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} sidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}

export default Layout
