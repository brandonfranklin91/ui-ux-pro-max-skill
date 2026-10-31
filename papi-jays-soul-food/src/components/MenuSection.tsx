import { useId, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { menu, wingFlavors, type MenuItem, type WingFlavor } from '../data/menu'
import { Picture } from './Picture'
import { ArrowRight, Check } from './Icons'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export function MenuSection() {
  const root = useRef<HTMLElement>(null)
  const [flavor, setFlavor] = useState<WingFlavor | null>(null)
  const statusId = useId()

  const items = useMemo(
    () => (flavor ? menu.filter((m) => m.flavors?.includes(flavor)) : menu),
    [flavor],
  )
  const flavorNote = wingFlavors.find((f) => f.name === flavor)?.note

  // Card reveal on enter (once). Reduced motion: cards are simply visible.
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const cards = gsap.utils.toArray<HTMLElement>('[data-card]')
        gsap.set(cards, { y: 32, autoAlpha: 0 })
        ScrollTrigger.batch(cards, {
          start: 'top 88%',
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              y: 0,
              autoAlpha: 1,
              duration: 0.7,
              ease: 'power3.out',
              stagger: 0.08,
              overwrite: true,
            }),
        })
        gsap.fromTo(
          '[data-menu-head] > *',
          { y: 24, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.08,
            scrollTrigger: { trigger: '[data-menu-head]', start: 'top 85%', once: true },
          },
        )
      })
      // Filtering changes the grid's height, which moves every section below.
      // Re-measure so later scroll triggers (Friday, Visit) fire at the right spot.
      ScrollTrigger.refresh()
      return () => mm.revert()
    },
    { scope: root, dependencies: [items.length] },
  )

  return (
    <section
      ref={root}
      id="menu"
      aria-labelledby="menu-title"
      className="texture-cream relative z-10 -mt-[12vh] rounded-t-[2rem] text-ink shadow-[0_-24px_60px_-20px_rgb(0_0_0/0.5)] md:rounded-t-[3rem]"
    >
      <div className="mx-auto max-w-7xl px-5 pb-24 pt-20 sm:px-8 md:pb-32 md:pt-28">
        <header data-menu-head className="max-w-3xl">
          <p className="eyebrow text-forest">The menu</p>
          <h2
            id="menu-title"
            className="font-display text-balance mt-4 text-5xl font-light leading-[0.98] sm:text-6xl md:text-7xl"
          >
            Find Your Favorite.
          </h2>
          <p className="text-pretty mt-5 max-w-xl text-lg leading-relaxed text-ink-600">
            Loaded plates, generous dinners, and wings tossed in the sauce you want. Prices
            are current drafts and may change.
          </p>
        </header>

        {/* Wing flavor chips: filter the grid to wing dinners and surface the flavor note */}
        <div className="mt-12 md:mt-16">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink">
              Wing flavors
            </h3>
            <p id={statusId} aria-live="polite" className="text-sm text-ink-600">
              {flavor
                ? `Showing wing dinners in ${flavor}. ${flavorNote}.`
                : 'Pick a flavor to see the wing dinners it comes on.'}
            </p>
          </div>
          <div role="group" aria-label="Filter menu by wing flavor" className="mt-4 flex flex-wrap gap-2">
            <Chip selected={flavor === null} onClick={() => setFlavor(null)}>
              All items
            </Chip>
            {wingFlavors.map((f) => (
              <Chip
                key={f.name}
                selected={flavor === f.name}
                onClick={() => setFlavor(flavor === f.name ? null : f.name)}
              >
                {f.name}
              </Chip>
            ))}
          </div>
        </div>

        <ul
          aria-describedby={statusId}
          className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8"
        >
          {items.map((item, i) => (
            <MenuCard key={item.id} item={item} flavor={flavor} featured={i === 0 && !flavor} />
          ))}
        </ul>
      </div>
    </section>
  )
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-[background-color,color,border-color,transform] duration-300 ease-out-expo active:scale-[0.97]',
        selected
          ? 'border-forest bg-forest text-cream'
          : 'border-ink/20 bg-transparent text-ink hover:border-ink/60 hover:bg-ink/5',
      ].join(' ')}
    >
      {selected && <Check width={16} height={16} />}
      {children}
    </button>
  )
}

function MenuCard({
  item,
  flavor,
  featured,
}: {
  item: MenuItem
  flavor: WingFlavor | null
  featured: boolean
}) {
  const note = flavor && item.flavors ? wingFlavors.find((f) => f.name === flavor)?.note : null
  return (
    <li
      data-card
      className={[
        'group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-[box-shadow,transform] duration-500 ease-out-expo hover:-translate-y-1 hover:shadow-card-hover',
        featured ? 'sm:col-span-2 lg:col-span-2' : '',
      ].join(' ')}
    >
      <div className="relative overflow-hidden">
        <Picture
          src={item.image}
          width={800}
          height={597}
          responsive
          sizes={featured ? '(min-width: 1024px) 60vw, 100vw' : '(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw'}
          alt={item.imageAlt}
          className={[
            'w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]',
            featured ? 'aspect-[16/9]' : 'aspect-[4/3]',
          ].join(' ')}
        />
        <span className="absolute left-4 top-4 rounded-full bg-charcoal/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cream backdrop-blur">
          {item.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-2xl leading-tight">{item.name}</h3>
          <p className="shrink-0 text-right">
            {item.priceNote?.startsWith('starting') && (
              <span className="block text-[11px] uppercase tracking-[0.14em] text-ink-600">
                starting at
              </span>
            )}
            <span className="font-display text-2xl text-forest">{item.price}</span>
          </p>
        </div>
        <p className="text-pretty mt-3 text-[15px] leading-relaxed text-ink-600">{item.description}</p>
        {note && (
          <p className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-forest/10 px-3 py-1 text-sm font-semibold text-forest">
            Tossed in {flavor}. {note}.
          </p>
        )}
        {item.priceNote && !item.priceNote.startsWith('starting') && (
          <p className="mt-3 text-sm text-ink-600">{item.priceNote}</p>
        )}
        {item.id === 'jerk-burger' && (
          <a
            href="burger.html"
            className="mt-4 inline-flex w-fit items-center gap-2 text-sm font-semibold text-forest underline decoration-forest/30 underline-offset-4 hover:decoration-forest"
          >
            See it built in 3D <ArrowRight width={16} height={16} />
          </a>
        )}
        <dl className="mt-auto pt-5 text-sm">
          {item.proteins && (
            <div className="flex gap-3 border-t border-ink/10 pt-3">
              <dt className="w-24 shrink-0 uppercase tracking-[0.12em] text-ink-600">Protein</dt>
              <dd>{item.proteins.join(' or ')}</dd>
            </div>
          )}
          {item.includes && (
            <div className="flex gap-3 border-t border-ink/10 pt-3">
              <dt className="w-24 shrink-0 uppercase tracking-[0.12em] text-ink-600">Includes</dt>
              <dd>{item.includes.join(', ')}</dd>
            </div>
          )}
        </dl>
      </div>
    </li>
  )
}
