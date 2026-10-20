import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, X } from 'lucide-react'

const SHOW_MS = 5000

// A form that saved something moves on with `navigate(to, { state: { toast } })`.
// This shows that line once at the foot of the screen, then takes it out of the
// history entry, so going back or reloading does not show it again.
const FlashMessage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [message, setMessage] = useState(null)

  useEffect(() => {
    const toast = location.state?.toast
    if (!toast) return
    setMessage({ text: toast, key: location.key })
    const { toast: _shown, ...rest } = location.state
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: Object.keys(rest).length ? rest : null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  useEffect(() => {
    if (!message) return
    const id = window.setTimeout(() => setMessage(null), SHOW_MS)
    return () => window.clearTimeout(id)
  }, [message])

  // The live region is always there, so the message is announced when it appears.
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex justify-center max-lg:bottom-20"
    >
      {message && (
        <p className="pointer-events-auto flex max-w-full items-center gap-2.5 rounded-xl bg-ink py-2.5 pl-3.5 pr-2 text-[14px] font-medium text-white shadow-panel">
          <CheckCircle2 size={16} className="flex-none text-[#5fd394]" aria-hidden="true" />
          <span className="min-w-0">{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            aria-label="Dismiss"
            className="grid size-7 flex-none place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </p>
      )}
    </div>
  )
}

export default FlashMessage
