import { site } from '../data/site'
import { Phone, Utensils } from './Icons'

/** Persistent bottom action on small screens: Menu is always one tap away. */
export function MobileMenuBar({ menuHref = '#menu' }: { menuHref?: string }) {
  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-cream/10 bg-charcoal/95 backdrop-blur-md md:hidden">
      <div className="flex gap-2 px-4 py-2.5">
        <a href={menuHref} className="btn btn-gold flex-1">
          <Utensils /> Menu
        </a>
        <a
          href={`tel:${site.phone.e164}`}
          className="btn btn-ghost w-12 px-0"
          aria-label={`Call ${site.phone.display}`}
        >
          <Phone />
        </a>
      </div>
    </div>
  )
}
