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

// What a student can do about an event right now. Registration closes at the
// cutoff, and the server refuses students outside the event's branches or
// years, so "Register" is only offered when `canRegister` is true.
export const eventStanding = (event, user, now = new Date()) => {
  const start = new Date(event.startDateTime)
  const end = new Date(event.endDateTime)
  const cutoff = registrationCutoff(event)
  const allowed = (list, value) => !list?.length || list.includes(value)
  const cancelled = event.status === 'Cancelled'
  const going = !!user?.registeredEvents?.some((e) => String(e?._id ?? e) === String(event._id))
  const open = !cancelled && now < cutoff
  const eligible =
    allowed(event.eligibleBranches, user?.branch) && allowed(event.eligibleYears, user?.year)

  return {
    going,
    cancelled,
    open,
    eligible,
    canRegister: open && eligible && !going,
    live: !cancelled && start <= now && now <= end,
    ended: end < now,
    // The deadline, when it is earlier than the start itself.
    closes: cutoff < start ? cutoff : null,
  }
}
