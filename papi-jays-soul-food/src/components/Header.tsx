import { useEffect, useId, useRef, useState } from 'react'
import { site } from '../data/site'
import { useScrolled } from '../hooks/useScrolled'
import { Close, Menu as MenuIcon, Phone } from './Icons'

const links = [
  { href: '#menu', label: 'Menu' },
  { href: '#friday', label: 'Friday Special' },
  { href: '#visit', label: 'Visit Us' },
]

export function Header() {
  const scrolled = useScrolled(40)
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const closeBtn = useRef<HTMLButtonElement>(null)
  const openBtn = useRef<HTMLButtonElement>(null)

  // Lock scroll + manage focus while the mobile sheet is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      openBtn.current?.focus()
    }
  }, [open])

  const solid = scrolled || open

  return (
    <header
      className={[
        'fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-500 ease-out-expo',
        solid
          ? 'bg-charcoal/92 shadow-[0_1px_0_rgb(244_236_220/0.08)] backdrop-blur-md'
          : 'bg-transparent',
      ].join(' ')}
    >
      <a
        href="#menu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:text-charcoal"
      >
        Skip to menu
      </a>
      <nav
        aria-label="Primary"
        className={[
          'mx-auto flex max-w-7xl items-center justify-between px-5 transition-[height] duration-500 ease-out-expo sm:px-8',
          solid ? 'h-16' : 'h-20 sm:h-24',
        ].join(' ')}
      >
        <a href="#top" className="flex items-center gap-3 rounded-sm" aria-label={`${site.name} home`}>
          <img
            src="/brand/logo-lion-chef-sm.png"
            width={478}
            height={372}
            alt=""
            className={[
              'w-auto drop-shadow-[0_2px_6px_rgb(0_0_0/0.5)] transition-[height] duration-500 ease-out-expo',
              solid ? 'h-11' : 'h-14 sm:h-16',
            ].join(' ')}
            decoding="async"
          />
          <span className="sr-only">{site.name}</span>
        </a>

        <ul className="hidden items-center gap-9 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="group relative py-2 text-[13px] font-semibold uppercase tracking-[0.18em] text-cream/85 transition-colors duration-300 hover:text-cream"
              >
                {l.label}
                <span
                  aria-hidden
                  className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-gold transition-transform duration-300 ease-out-expo group-hover:scale-x-100"
                />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <a
            href={`tel:${site.phone.e164}`}
            className="hidden h-11 w-11 items-center justify-center rounded-full text-cream/85 transition-colors hover:bg-cream/10 hover:text-cream lg:inline-flex"
            aria-label={`Call ${site.phone.display}`}
          >
            <Phone />
          </a>
          <a href="#menu" className="btn btn-gold hidden md:inline-flex">
            View Menu
          </a>
          <button
            ref={openBtn}
            type="button"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-cream transition-colors hover:bg-cream/10 md:hidden"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <MenuIcon width={24} height={24} />
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      <div
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        hidden={!open}
        className="fixed inset-0 z-[60] bg-charcoal text-cream md:hidden"
      >
        <div className="flex h-16 items-center justify-between px-5">
          <img src="/brand/logo-lion-chef-sm.png" width={478} height={372} alt="" className="h-11 w-auto" />
          <button
            ref={closeBtn}
            type="button"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-cream hover:bg-cream/10"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <Close width={24} height={24} />
          </button>
        </div>
        <ul className="mt-6 flex flex-col px-5">
          {links.map((l) => (
            <li key={l.href} className="border-b border-cream/10">
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-display block py-5 text-3xl font-light text-cream hover:text-gold"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col gap-3 px-5">
          <a href="#menu" onClick={() => setOpen(false)} className="btn btn-gold w-full">
            View Menu
          </a>
          <a href={`tel:${site.phone.e164}`} className="btn btn-ghost w-full">
            <Phone /> Call {site.phone.display}
          </a>
        </div>
        <p className="eyebrow mt-10 px-5 text-cream/50">{site.city}</p>
      </div>
    </header>
  )
}
