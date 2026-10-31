import { useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { activeLocation, directionsUrl, mapEmbedUrl, site } from '../data/site'
import { Clock, MapPin, Phone } from './Icons'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export function Visit() {
  const root = useRef<HTMLElement>(null)
  const loc = activeLocation()
  // Tulsa is on Central time; highlight today's row there, not in the visitor's zone.
  const [today] = useState(() =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Chicago' }),
  )

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '[data-visit-item]',
          { y: 28, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.1,
            scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
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
      id="visit"
      aria-labelledby="visit-title"
      className="texture-cream relative text-ink"
    >
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 md:py-32">
        <div data-visit-item className="max-w-3xl">
          <p className="eyebrow text-forest">Visit us</p>
          <h2
            id="visit-title"
            className="font-display text-balance mt-4 text-5xl font-light leading-[0.98] sm:text-6xl md:text-7xl"
          >
            Come Hungry.
          </h2>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
            {/* Location */}
            <div data-visit-item>
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em]">
                <MapPin width={18} height={18} className="text-forest" /> Location
              </h3>
              <address className="font-display mt-4 text-3xl not-italic leading-snug">
                {loc.street}
                <br />
                <span className="text-ink-600">{loc.cityStateZip}</span>
              </address>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={directionsUrl()} target="_blank" rel="noopener noreferrer" className="btn btn-forest">
                  <MapPin /> Get directions
                </a>
                <a href={`tel:${site.phone.e164}`} className="btn btn-outline-ink">
                  <Phone /> {site.phone.display}
                </a>
              </div>
            </div>

            {/* Hours */}
            <div data-visit-item>
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em]">
                <Clock width={18} height={18} className="text-forest" /> Hours
              </h3>
              <table className="mt-4 w-full text-[15px]">
                <caption className="sr-only">Opening hours</caption>
                <tbody>
                  {site.hours.days.map((d) => {
                    const isToday = d.day === today
                    return (
                      <tr
                        key={d.day}
                        className={[
                          'border-b border-ink/10',
                          isToday ? 'font-semibold text-forest' : '',
                        ].join(' ')}
                        aria-current={isToday ? 'date' : undefined}
                      >
                        <th scope="row" className="py-2.5 text-left font-[inherit]">
                          {d.day}
                          {isToday && <span className="ml-2 text-xs uppercase tracking-[0.14em]">Today</span>}
                        </th>
                        <td className="py-2.5 text-right">
                          {d.open ? (
                            `${d.open} to ${d.close}`
                          ) : (
                            <a
                              href={`tel:${site.phone.e164}`}
                              className="text-ink-600 underline decoration-ink/25 underline-offset-4 hover:text-ink hover:decoration-ink"
                            >
                              Call for hours
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Map */}
          <div data-visit-item className="lg:col-span-7">
            <div className="relative h-full min-h-[320px] overflow-hidden rounded-[1.5rem] bg-cream-300 shadow-card">
              <iframe
                title={`Map showing ${site.name} at ${loc.street}`}
                src={mapEmbedUrl()}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full border-0 grayscale-[35%] sepia-[15%]"
              />
              <a
                href={directionsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-charcoal/90 px-4 py-2 text-sm font-semibold text-cream backdrop-blur hover:bg-charcoal"
              >
                <MapPin width={16} height={16} /> Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
