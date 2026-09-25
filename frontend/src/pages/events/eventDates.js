export const formatEventDay = (value) => {
  const date = new Date(value)
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== new Date().getFullYear() && { year: 'numeric' }),
  })
}

// Registration closes at the earlier of the deadline and the event start.
export const registrationCutoff = (event) => {
  const start = new Date(event.startDateTime)
  if (!event.registrationDeadline) return start
  const deadline = new Date(event.registrationDeadline)
  return deadline < start ? deadline : start
}
