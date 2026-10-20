export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatShortDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

const pad = (value) => String(value).padStart(2, '0')

// HTML date inputs use local calendar fields, while toISOString() uses UTC.
export const toLocalDateInput = (value) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const toLocalDateTimeInput = (value) => {
  const date = new Date(value)
  return `${toLocalDateInput(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Notices and notifications: relative while it is recent, a real date after a
// week ("Just now" → "5m ago" → "3h ago" → "Yesterday" → "4d ago" → "11 Sep").
export const formatTimeAgo = (date) => {
  if (!date) return ''
  const then = new Date(date)
  const mins = Math.floor((Date.now() - then.getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return then.getFullYear() === new Date().getFullYear() ? formatShortDate(then) : formatDate(then)
}

// Full date and time, for the tooltip behind a formatTimeAgo label.
export const formatDateTime = (date) =>
  date
    ? new Date(date).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

// 12-hour clock for the converted screens: "9:00 am".
export const formatClock = (date) =>
  new Date(date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })

// "9:00 – 9:55 am" when both ends fall in the same half of the day.
export const formatClockRange = (start, end) => {
  const from = formatClock(start)
  const to = formatClock(end)
  return from.slice(-2) === to.slice(-2) ? `${from.slice(0, -3)} – ${to}` : `${from} – ${to}`
}

const startOfDay = (value) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

// Whole calendar days from today: 0 is today, 1 is tomorrow, -1 yesterday.
// Rounded, so a 23- or 25-hour day at a clock change still counts as one.
export const daysFromToday = (date) =>
  Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000)

// "Today" / "Tomorrow" / "14 Oct"
export const describeDay = (date) => {
  const days = daysFromToday(date)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return formatShortDate(date)
}

// "Tomorrow, 7:00 pm"
export const describeWhen = (date) => `${describeDay(date)}, ${formatClock(date)}`
