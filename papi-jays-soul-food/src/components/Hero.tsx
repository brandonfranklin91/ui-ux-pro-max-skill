import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { site } from '../data/site'
import { Picture } from './Picture'
import { Steam } from './Steam'
import { ArrowDown } from './Icons'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const labels = [
  { n: '01', title: 'Friday Gumbo', note: 'Four meats, one bowl' },
  { n: '02', title: 'Signature Wings', note: 'Six flavors, tossed to order' },
  { n: '03', title: 'Loaded Favorites', note: 'Fries, nachos, and potatoes' },
]

/**
 * Scroll-choreographed hero. A tall scroll container holds a sticky,
 * viewport-height scene; a scrubbed GSAP timeline maps scroll progress 0..1
 * to four phases. Under prefers-reduced-motion the scene is a plain,
 * static, single-viewport hero.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      const q = gsap.utils.selector(root)

      const build = (mobile: boolean) => {
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        })

        // Phase 1 (0-25%): slow push-in, headline drifts up and fades.
        tl.fromTo(q('[data-food]'), { scale: 1 }, { scale: 1.08, duration: 0.25 }, 0)
          .to(q('[data-bg]'), { yPercent: -4, duration: 0.25 }, 0)
          .to(q('[data-copy]'), { yPercent: -18, autoAlpha: 0, duration: 0.22 }, 0.03)
          .to(q('[data-cue]'), { autoAlpha: 0, duration: 0.1 }, 0)

        // Phase 2 (25-60%): bowl shifts right, "Made to satisfy." reveals on the left.
        tl.to(
          q('[data-food]'),
          mobile
            ? { xPercent: 0, yPercent: -16, scale: 0.9, duration: 0.35 }
            : { xPercent: 16, scale: 1.0, duration: 0.35 },
          0.25,
        )
          .to(q('[data-bg]'), { xPercent: mobile ? 0 : -3, duration: 0.35 }, 0.25)
          .fromTo(
            q('[data-tagline] > *'),
            { yPercent: 40, autoAlpha: 0 },
            { yPercent: 0, autoAlpha: 1, stagger: 0.04, duration: 0.2 },
            0.32,
          )

        // Phase 3 (60-85%): three editorial labels, deliberate and small.
        tl.fromTo(
          q('[data-label]'),
          { y: 24, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, stagger: 0.05, duration: 0.14 },
          0.6,
        )

        // Phase 4 (85-100%): fade hero text, scene settles, menu slides over.
        tl.to(q('[data-tagline], [data-label]'), { autoAlpha: 0, y: -16, duration: 0.12 }, 0.86)
          .to(q('[data-food]'), { yPercent: mobile ? -28 : -8, scale: mobile ? 0.84 : 0.94, duration: 0.15 }, 0.85)
          .to(q('[data-scene]'), { autoAlpha: 0.55, duration: 0.15 }, 0.85)
        return tl
      }

      mm.add(
        {
          desktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
          mobile: '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
        },
        (ctx) => {
          const { mobile } = ctx.conditions as { mobile: boolean }
          build(mobile)
        },
      )
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section
      ref={root}
      id="top"
      aria-labelledby="hero-title"
      className="relative h-[160vh] bg-charcoal motion-reduce:h-auto md:h-[240vh]"
    >
      <div
        data-scene
        className="sticky top-0 flex h-svh min-h-[560px] flex-col overflow-hidden motion-reduce:static motion-reduce:h-auto motion-reduce:min-h-svh"
      >
        {/* Background: warm spotlight + vignette, parallaxed independently */}
        <div
          data-bg
          aria-hidden
          className="absolute -inset-[6%] bg-[radial-gradient(ellipse_at_62%_42%,rgb(201_162_74/0.22),transparent_52%),radial-gradient(ellipse_at_50%_100%,rgb(15_61_34/0.35),transparent_60%)]"
        />

        {/* Food layer: oversized so it can shift right without exposing an edge */}
        <div
          data-food
          className="absolute inset-y-0 left-[-14%] w-[128%] will-change-transform motion-reduce:left-0 motion-reduce:w-full md:left-[-16%] md:w-[132%]"
        >
          <Picture
            src="/food/gumbo-hero"
            width={1600}
            height={1073}
            priority
            alt="Close-up of a seafood gumbo bowl with chicken, beef link, shrimp, and crab over white rice"
            className="h-full w-full object-cover object-[58%_50%] md:object-[60%_50%]"
          />
          <Steam className="bottom-[34%] left-[40%] h-[30%] w-[30%] md:left-[44%]" />
        </div>

        {/* Readability gradients */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(18_19_17/0.72)_0%,rgb(18_19_17/0.25)_35%,rgb(18_19_17/0.2)_60%,rgb(18_19_17/0.9)_100%)] md:bg-[linear-gradient(to_right,rgb(18_19_17/0.88)_0%,rgb(18_19_17/0.55)_38%,rgb(18_19_17/0.1)_70%),linear-gradient(to_bottom,rgb(18_19_17/0.5),transparent_30%,transparent_70%,rgb(18_19_17/0.85))]"
        />

        {/* Primary copy */}
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-5 pb-28 pt-28 sm:px-8 md:justify-center md:pb-24">
          <div data-copy className="max-w-2xl">
            <p className="eyebrow text-gold">{site.city}</p>
            <h1
              id="hero-title"
              className="font-display text-balance mt-5 text-[2.9rem] leading-[0.98] font-light text-cream sm:text-6xl md:text-7xl lg:text-[5.6rem]"
            >
              Big Flavor.
              <br />
              <em className="not-italic font-normal text-gold-300">Deep Soul.</em>
            </h1>
            <p className="text-pretty mt-6 max-w-md text-base leading-relaxed text-cream/80 sm:text-lg">
              Soul food favorites, loaded plates, and Friday gumbo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#menu" className="btn btn-gold">
                Explore the Menu
              </a>
              <a href="#friday" className="btn btn-ghost">
                Friday Gumbo
              </a>
            </div>
          </div>

          {/* Phase 2 + 3 content (hidden until scrolled; visible statically under reduced motion) */}
          <div className="pointer-events-none absolute inset-x-5 top-1/2 -translate-y-1/2 sm:inset-x-8 md:left-8 md:right-auto md:max-w-xl lg:left-[max(2rem,calc((100vw-80rem)/2+2rem))]">
            <div data-tagline className="motion-ok:[&>*]:opacity-0">
              <p className="eyebrow text-gold">Made right, every time</p>
              <h2 className="font-display text-balance mt-4 text-5xl font-light leading-[0.95] text-cream sm:text-6xl md:text-7xl lg:text-8xl">
                Made to satisfy.
              </h2>
            </div>
            <ul className="mt-10 grid gap-5 sm:grid-cols-3 md:mt-14 md:max-w-lg md:grid-cols-1 md:gap-4">
              {labels.map((l) => (
                <li
                  key={l.n}
                  data-label
                  className="motion-ok:opacity-0 flex items-baseline gap-4 border-t border-cream/15 pt-3"
                >
                  <span className="font-display text-sm text-gold">{l.n}</span>
                  <span>
                    <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-cream">
                      {l.title}
                    </span>
                    <span className="block text-sm text-cream/60">{l.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Scroll cue */}
        <div
          data-cue
          className="pointer-events-none absolute inset-x-0 bottom-20 z-10 flex justify-center md:bottom-8"
        >
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-cream/60">
            Scroll for a taste
            <ArrowDown width={14} height={14} className="motion-ok:animate-bounce" />
          </span>
        </div>
      </div>
    </section>
  )
}
