export const formatRegistrationDeadlineTime = (date) => {
  if (date.getHours() === 0 && date.getMinutes() === 0) return '11:59 PM'
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
