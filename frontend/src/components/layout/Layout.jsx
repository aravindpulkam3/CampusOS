import { Outlet, useLocation } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import TopBar from './TopBar'
import SectionTabs from './SectionTabs'
import TabBar from './TabBar'
import Footer from './Footer'
import NotificationToasts from './NotificationToasts'
import FlashMessage from './FlashMessage'
import { getSections, sectionKeyFor } from './navConfig'

// App shell: the top bar, the current section's tabs, the page, and (below lg)
// a bottom tab bar. <main> is the only scroller, so an over-wide row pans the
// page area and never the whole document.
const Layout = () => {
  const { pathname } = useLocation()
  const { user } = useAuth()

  const sections = getSections(user)
  const activeKey = sectionKeyFor(pathname)
  const active = sections.find((section) => section.key === activeKey)

  return (
    <div className="page-wash flex h-dvh flex-col overflow-hidden bg-white">
      {/* The first thing Tab reaches: jumps past the top bar and section tabs */}
      <a
        href="#content"
        className="fixed left-4 top-3 z-[200] -translate-y-24 rounded-[10px] bg-ink px-4 py-2.5 text-[14px] font-semibold text-white shadow-panel transition-transform focus:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2"
      >
        Skip to content
      </a>
      <NotificationToasts />
      <FlashMessage />
      <TopBar sections={sections} activeKey={activeKey} />
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-[1184px] flex-1 px-4 sm:px-8">
          {active?.tabs && <SectionTabs tabs={active.tabs} label={active.label} />}
          <div id="content" tabIndex={-1} className="py-6 outline-none">
            <Outlet />
          </div>
        </div>
        <Footer />
      </main>
      <TabBar sections={sections} activeKey={activeKey} />
    </div>
  )
}

export default Layout
