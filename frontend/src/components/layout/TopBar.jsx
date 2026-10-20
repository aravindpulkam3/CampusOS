import { Link, useLocation } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import useImageOk from '../../hooks/useImageOk'
import GlobalSearch from './GlobalSearch'
import NotificationBell from './NotificationBell'

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25'

// Brand, the sections (from lg up; phones use the TabBar), search, notifications
// and the profile shortcut.
const TopBar = ({ sections, activeKey }) => {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [showPicture, onPictureError] = useImageOk(user?.profilePicture)

  return (
    <header className="flex-shrink-0 border-b border-ink/[0.06]">
      {/* h-14 on phones: the search and notification panels pin themselves at top-16 there */}
      <div className="mx-auto flex h-14 w-full max-w-[1184px] items-center gap-3 px-4 sm:h-16 sm:px-8 lg:gap-7">
        <Link
          to="/"
          aria-label="EventSphere home"
          className={`flex flex-shrink-0 items-center gap-2.5 rounded-lg text-[15.5px] font-semibold tracking-tight text-ink ${focusRing}`}
        >
          <span aria-hidden="true" className="relative size-[22px] rounded-[7px] bg-ink">
            <span className="absolute inset-[6px] -rotate-[30deg] rounded-full border-2 border-white border-r-transparent" />
          </span>
          {/* Phones keep the mark only: the search box needs the room */}
          <span className="hidden sm:inline">EventSphere</span>
        </Link>

        <nav aria-label="Sections" className="hidden items-center gap-0.5 lg:flex">
          {sections.map(({ key, label, to }) => {
            const active = key === activeKey
            return (
              <Link
                key={key}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex h-[34px] items-center rounded-[9px] px-3 text-[14.5px] font-medium transition-colors ${focusRing} ${
                  active ? 'bg-ink/[0.06] text-ink' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="flex-1" />

        {/* On narrow screens the search box shrinks so the bell and avatar stay visible */}
        <div className="flex min-w-0 items-center gap-2">
          <GlobalSearch />
          {user && (
            <>
              <NotificationBell />
              <Link
                to="/profile"
                aria-label="Your profile"
                aria-current={pathname === '/profile' ? 'page' : undefined}
                className={`flex size-[34px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-xs font-semibold text-white ${focusRing}`}
              >
                {showPicture ? (
                  <img
                    src={user.profilePicture}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={onPictureError}
                  />
                ) : (
                  user.firstName?.charAt(0).toUpperCase() || '?'
                )}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default TopBar
