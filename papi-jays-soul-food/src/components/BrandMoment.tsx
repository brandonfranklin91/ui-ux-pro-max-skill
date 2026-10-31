import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { site } from '../data/site'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const words = ['Good Food.', 'Good People.', 'Good Vibes.']

/** A quiet pause between sections: the lion chef and the house motto. */
export function BrandMoment() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: root.current, start: 'top 72%', once: true },
        })
        tl.fromTo(
          '[data-brand-logo]',
          { y: 24, scale: 0.94, autoAlpha: 0 },
          { y: 0, scale: 1, autoAlpha: 1, duration: 1.1, ease: 'expo.out' },
        ).fromTo(
          '[data-brand-word]',
          { yPercent: 60, autoAlpha: 0 },
          { yPercent: 0, autoAlpha: 1, duration: 0.9, ease: 'power3.out', stagger: 0.12 },
          0.25,
        )
        gsap.fromTo(
          '[data-brand-crest]',
          { rotate: -6 },
          {
            rotate: 6,
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
      aria-label={`About ${site.name}`}
      className="texture-dark relative overflow-hidden bg-charcoal py-28 text-center text-cream md:py-40"
    >
      {/* Gold crest watermark */}
      <img
        data-brand-crest
        src="/brand/crest-gold.webp"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute left-1/2 top-1/2 w-[min(120vw,64rem)] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.06]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgb(201_162_74/0.16),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-4xl px-5 sm:px-8">
        <img
          data-brand-logo
          src="/brand/logo-lion-chef.png"
          width={955}
          height={744}
          alt={`${site.name} lion chef logo`}
          loading="lazy"
          decoding="async"
          className="mx-auto h-auto w-[min(72vw,22rem)] drop-shadow-[0_20px_40px_rgb(0_0_0/0.55)]"
        />
        <div className="hairline-gold mx-auto mt-10 w-16" />
        <p className="font-display mt-10 text-4xl font-light leading-[1.05] sm:text-5xl md:text-6xl">
          {words.map((w, i) => (
            <span key={w} className="inline-block overflow-hidden align-bottom">
              <span data-brand-word className={['inline-block px-[0.12em]', i === 1 ? 'text-gold-300' : ''].join(' ')}>
                {w}
              </span>
            </span>
          ))}
        </p>
        <p className="eyebrow mt-8 text-cream/55">{site.city}</p>
      </div>
    </section>
  )
}
