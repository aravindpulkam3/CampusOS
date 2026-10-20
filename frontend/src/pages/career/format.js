import { daysFromToday, formatClock } from '../../utils/formatDate'
import { formatEventDay } from '../events/eventDates'

// How drives, their deadlines, rounds and applications read on every career page.

export const formatRegistrationDeadlineTime = (date) => {
  if (date.getHours() === 0 && date.getMinutes() === 0) return '11:59 PM'
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export const JOB_TYPE = { internship: 'Internship', fulltime: 'Full time' }

export const DRIVE_TYPE = {
  oncampus: 'On campus',
  offcampus: 'Off campus',
  poolcampus: 'Pool campus',
}

// What a drive pays: the stipend for an internship, the CTC otherwise.
export const drivePay = (drive) =>
  (drive?.jobType === 'internship' ? drive?.stipend : drive?.ctc) || ''

// Where a registration deadline stands. `when` is the deadline itself
// ("Wed, 14 Oct, 6:00 pm"), `label` how close it is, `tone` how pressing.
export const describeDeadline = (value) => {
  if (!value) return null
  const date = new Date(value)
  const when = `${formatEventDay(date)}, ${formatRegistrationDeadlineTime(date).toLowerCase()}`
  if (date < new Date()) return { closed: true, label: 'Closed', when }
  const days = daysFromToday(date)
  if (days <= 0) return { closed: false, label: 'Closes today', tone: 'urgent', when }
  if (days === 1) return { closed: false, label: 'Closes tomorrow', tone: 'warn', when }
  return { closed: false, label: `${days} days left`, when }
}

// When a round is held. A round saved at midnight has a day but no time yet.
export const formatRoundDate = (value) => {
  if (!value) return 'Date to be announced'
  const date = new Date(value)
  if (date.getHours() === 0 && date.getMinutes() === 0) return `${formatEventDay(date)}, time to be announced`
  return `${formatEventDay(date)}, ${formatClock(date)}`
}

// Every label a round can show. The state is derived on the server from the
// round's place relative to the current one (backend utils/roundState.js),
// never a fixed assessment/interview vocabulary.
export const ROUND_STATE = {
  upcoming: { label: 'Upcoming', tone: 'neutral' },
  ongoing: { label: 'Ongoing', tone: 'wait' },
  ended_awaiting: { label: 'Ended, results awaited', tone: 'wait' },
  processed: { label: 'Results processed', tone: 'good' },
}

// Intentionally simple: an application is active, selected or rejected.
export const APPLICATION_STATUS = {
  active: { label: 'Active', tone: 'wait' },
  selected: { label: 'Selected', tone: 'good' },
  rejected: { label: 'Rejected', tone: 'bad' },
}
