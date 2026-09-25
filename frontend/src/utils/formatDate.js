export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatShortDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export const formatTime24 = (date) =>
  new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

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

export const formatRelativeTime = (date) => {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
