import { House, Users, BookOpen, MessageSquare, Briefcase, ShieldCheck } from 'lucide-react'

// One description of the app's sections, shared by the top bar, the section
// tabs and the phone tab bar. A section's `tabs` are its own pages.
export const getSections = (user) => {
  const classroomPath = user?.classroom
    ? `/academics/classroom/${user.classroom}`
    : '/academics/classroom/unassigned'

  return [
    { key: 'home', label: 'Home', to: '/', icon: House },
    {
      key: 'community',
      label: 'Community',
      to: '/community',
      icon: Users,
      tabs: [
        { label: 'Feed', to: '/community', end: true },
        { label: 'Events', to: '/community/events' },
        { label: 'Clubs', to: '/community/clubs' },
      ],
    },
    {
      key: 'academics',
      label: 'Academics',
      // Without a classroom there is nothing to open there, so land on prep.
      to: user?.classroom ? classroomPath : '/academics/competitive',
      icon: BookOpen,
      tabs: [
        { label: 'Classroom', to: classroomPath },
        { label: 'Competitive prep', to: '/academics/competitive' },
      ],
    },
    { key: 'discussions', label: 'Discussions', to: '/discussions', icon: MessageSquare },
    {
      key: 'career',
      label: 'Career',
      to: '/career',
      icon: Briefcase,
      tabs: [
        { label: 'Overview', to: '/career', end: true },
        { label: 'Drives', to: '/career/drives' },
        { label: 'My applications', to: '/career/my-applications' },
      ],
    },
    ...(user?.role === 'superadmin'
      ? [{ key: 'admin', label: 'Admin', to: '/admin', icon: ShieldCheck }]
      : []),
  ]
}

// First path segment -> owning section. The generic notice/announcement forms
// live at /<targetType>/<id>/create-notice, outside their section's own prefix.
const OWNER = {
  community: 'community',
  club: 'community',
  event: 'community',
  academics: 'academics',
  classroom: 'academics',
  discussions: 'discussions',
  career: 'career',
  drive: 'career',
  admin: 'admin',
}

export const sectionKeyFor = (pathname) =>
  pathname === '/' ? 'home' : OWNER[pathname.split('/')[1]] ?? null
