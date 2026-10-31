import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { fridaySpecial } from '../data/menu'
import { directionsUrl, site } from '../data/site'
import { Picture } from './Picture'
import { Clock, MapPin, Phone } from './Icons'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * Friday gumbo feature. The photo opens with a gentle clip reveal and a slow
 * settle as the section enters. Reduced motion shows everything at rest.
 */
export function FridayFeature() {
  const root = useRef<HTMLElement>(null)
  const friday = site.hours.days.find((d) => d.day === 'Friday')

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: root.current, start: 'top 70%', once: true },
        })
        tl.fromTo(
          '[data-friday-frame]',
          { clipPath: 'inset(12% 10% 12% 10% round 1.5rem)' },
          { clipPath: 'inset(0% 0% 0% 0% round 1.5rem)', duration: 1.4, ease: 'expo.out' },
          0,
        )
          .fromTo('[data-friday-img]', { scale: 1.16 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0)
          .fromTo(
            '[data-friday-copy] > *',
            { y: 28, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.9, ease: 'power3.out', stagger: 0.08 },
            0.2,
          )

        // Slow parallax drift on the photo while the section is on screen.
        gsap.fromTo(
          '[data-friday-img-wrap]',
          { yPercent: -4 },
          {
            yPercent: 4,
            ease: 'none',
            scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        )
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id="friday"
      aria-labelledby="friday-title"
      className="texture-forest relative overflow-hidden text-cream"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 sm:px-8 md:grid-cols-12 md:gap-10 md:py-32 lg:gap-16">
        {/* Photo */}
        <div className="md:col-span-6 lg:col-span-6">
          <div
            data-friday-frame
            className="relative overflow-hidden rounded-[1.5rem] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)]"
          >
            <div data-friday-img-wrap className="will-change-transform">
              <Picture
                data-friday-img
                src={fridaySpecial.image}
                width={900}
                height={1117}
                responsive
                sizes="(min-width: 768px) 50vw, 100vw"
                alt={fridaySpecial.imageAlt}
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
            <span className="absolute left-5 top-5 rounded-full bg-gold px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-charcoal">
              Fridays only
            </span>
          </div>
        </div>

        {/* Copy */}
        <div data-friday-copy className="md:col-span-6 lg:col-span-5 lg:col-start-8">
          <p className="eyebrow text-gold-300">Friday special</p>
          <h2
            id="friday-title"
            className="font-display text-balance mt-4 text-5xl font-light leading-[0.95] sm:text-6xl lg:text-7xl"
          >
            Fridays Have Flavor.
          </h2>

          <div className="mt-10 flex items-end justify-between gap-6 border-b border-cream/15 pb-6">
            <div>
              <h3 className="font-display text-3xl">{fridaySpecial.title}</h3>
              <p className="text-pretty mt-2 max-w-sm leading-relaxed text-cream/75">
                {fridaySpecial.description}
              </p>
            </div>
            <p className="font-display shrink-0 text-5xl text-gold-300">{fridaySpecial.price}</p>
          </div>

          <ul className="mt-5 flex flex-wrap gap-2" aria-label="In every bowl">
            {fridaySpecial.meats.map((m) => (
              <li
                key={m}
                className="rounded-full border border-cream/20 px-3.5 py-1.5 text-sm font-semibold text-cream/90"
              >
                {m}
              </li>
            ))}
          </ul>

          <h3 className="mt-10 text-sm font-semibold uppercase tracking-[0.18em] text-cream/70">
            Add to your order
          </h3>
          <ul className="mt-3 divide-y divide-cream/10 border-y border-cream/10">
            {fridaySpecial.addOns.map((a) => (
              <li key={a.name} className="flex items-center gap-4 py-4">
                <Picture
                  src={a.name.toLowerCase().includes('lemonade') ? '/food/lemonade' : '/food/fish-dinner'}
                  width={800}
                  height={597}
                  responsive
                  sizes="64px"
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-cream/15"
                />
                <span className="flex-1">
                  <span className="block font-semibold">{a.name}</span>
                  <span className="block text-sm text-cream/60">{a.note}</span>
                </span>
                <span className="font-display text-2xl text-gold-300">{a.price}</span>
              </li>
            ))}
          </ul>

          {friday?.open && (
            <p className="mt-6 inline-flex items-center gap-2 text-sm text-cream/80">
              <Clock width={18} height={18} className="text-gold-300" />
              Friday {friday.open} to {friday.close}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <a href={`tel:${site.phone.e164}`} className="btn btn-gold">
              <Phone /> Call {site.phone.display}
            </a>
            <a href={directionsUrl()} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
              <MapPin /> Get directions
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
