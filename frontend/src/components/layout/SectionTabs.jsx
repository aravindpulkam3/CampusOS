import { NavLink } from 'react-router-dom'

// A section's own pages. The row scrolls on its own when the tabs don't fit,
// so the page never pans sideways.
const SectionTabs = ({ tabs, label }) => (
  <nav
    aria-label={label}
    className="no-scrollbar flex gap-6 overflow-x-auto border-b border-line"
  >
    {tabs.map(({ label: tabLabel, to, end }) => (
      <NavLink
        key={tabLabel}
        to={to}
        end={end}
        className={({ isActive }) =>
          `-mb-px flex-shrink-0 whitespace-nowrap border-b-2 pb-[11px] pt-3.5 text-[14.5px] transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/25
          ${isActive
            ? 'border-ink font-semibold text-ink'
            : 'border-transparent font-medium text-ink-2 hover:text-ink'
          }`
        }
      >
        {tabLabel}
      </NavLink>
    ))}
  </nav>
)

export default SectionTabs
