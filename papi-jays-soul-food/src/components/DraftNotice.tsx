import { useState } from 'react'
import { site } from '../data/site'

/**
 * Reminder for the owners while reviewing: shown only in `npm run dev`, and
 * only while some contact details are still unconfirmed. Never ships.
 */
export function DraftNotice() {
  const [open, setOpen] = useState(true)
  if (!import.meta.env.DEV || !open) return null

  const pending = [
    !site.locations.some((l) => l.active && l.verified) && 'address',
    !site.phone.verified && 'phone',
    !site.hours.verified && 'hours',
    'prices',
  ].filter(Boolean)
  if (pending.length === 0) return null

  return (
    <div
      role="status"
      className="fixed bottom-20 left-4 z-40 flex max-w-xs items-start gap-3 rounded-2xl bg-brand-yellow px-4 py-3 text-sm text-charcoal shadow-card md:bottom-4"
    >
      <p>
        <strong>Draft content.</strong> Confirm {pending.join(', ')} before publishing.
      </p>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="-mr-1 cursor-pointer rounded-full px-2 font-bold hover:bg-charcoal/10"
        aria-label="Dismiss draft notice"
      >
        ×
      </button>
    </div>
  )
}
