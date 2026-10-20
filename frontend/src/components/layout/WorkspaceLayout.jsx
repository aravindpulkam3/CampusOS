import { Outlet } from 'react-router-dom'
import SectionTabs from './SectionTabs'

// A workspace with its own tab row (the admin area). The negative margin lifts
// the tabs up against the top bar, where the shell puts every other section's.
const WorkspaceLayout = ({ tabs }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="-mt-6 mb-6">
        <SectionTabs
          tabs={tabs.map(({ label, path, end }) => ({ label, to: path, end }))}
          label="Admin"
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}

export default WorkspaceLayout
