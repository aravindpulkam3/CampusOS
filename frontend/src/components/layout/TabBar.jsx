import { Link } from 'react-router-dom'

// Below lg the sections live here, in thumb reach, instead of in the top bar.
const TabBar = ({ sections, activeKey }) => (
  <nav
    aria-label="Sections"
    className="flex flex-shrink-0 border-t border-line-2 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
  >
    {sections.map(({ key, label, to, icon: Icon }) => {
      const active = key === activeKey
      return (
        <Link
          key={key}
          to={to}
          aria-current={active ? 'page' : undefined}
          className={`flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/25
            ${active ? 'font-semibold text-ink' : 'font-medium text-ink-3'}`}
        >
          <Icon size={21} strokeWidth={active ? 2 : 1.7} aria-hidden="true" />
          <span className="max-w-full truncate px-1">{label}</span>
        </Link>
      )
    })}
  </nav>
)

export default TabBar
