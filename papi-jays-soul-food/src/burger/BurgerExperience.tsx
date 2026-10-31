import { useEffect, useRef, useState } from 'react'
import { menu } from '../data/menu'
import { site } from '../data/site'
import { Picture } from '../components/Picture'
import { ArrowDown, Phone } from '../components/Icons'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { BurgerScene, labelKeys, webglAvailable, type LabelKey } from './BurgerScene'

const burger = menu.find((m) => m.id === 'jerk-burger')!
const singlePrice = burger.price
const doublePrice = burger.priceNote?.match(/\$\d+/)?.[0] ?? ''

const labelText: Record<LabelKey, string> = {
  topBun: 'Top bun',
  lettuce: 'Lettuce',
  tomato: 'Tomato',
  pickles: 'Pickles',
  patty: 'Jerk-seasoned beef patty',
  bottomBun: 'Bottom bun',
}

/** Scroll windows for each text beat: [in start, in end, out start, out end]. */
const beats: [number, number, number, number][] = [
  [-1, -1, 0.08, 0.15],
  [0.17, 0.24, 0.36, 0.42],
  [0.43, 0.48, 0.57, 0.62],
  [0.66, 0.72, 0.79, 0.83],
  [0.86, 0.93, 2, 2],
]
const chapters = ['The burger', 'The layers', 'The patty', 'The double', 'Your order']

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const ramp = (a: number, b: number, v: number) => (a < 0 ? 1 : clamp01((v - a) / (b - a)))

export function BurgerExperience() {
  const reduced = useReducedMotion()
  const [gl] = useState(() => typeof window !== 'undefined' && webglAvailable())
  const immersive = gl && !reduced

  const track = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<BurgerScene | null>(null)
  const panels = useRef<(HTMLDivElement | null)[]>([])
  const labels = useRef<Partial<Record<LabelKey, HTMLElement>>>({})
  const rail = useRef<HTMLDivElement>(null)
  const railWrap = useRef<HTMLDivElement>(null)
  const [isDouble, setIsDouble] = useState(false)
  const [active, setActive] = useState(0)

  // Create the WebGL scene once.
  useEffect(() => {
    if (!gl || !canvas.current || !stage.current) return
    let scene: BurgerScene
    try {
      scene = new BurgerScene(canvas.current)
    } catch {
      return
    }
    sceneRef.current = scene
    scene.setLabelElements(labels.current)
    // `vite build --mode capture` only: lets the video recorder drive frames. Stripped from normal builds.
    if (import.meta.env.MODE === 'capture') (window as unknown as { __burger?: BurgerScene }).__burger = scene

    const resize = () => {
      const r = stage.current!.getBoundingClientRect()
      scene.setSize(r.width, r.height)
      if (reduced) scene.renderOnce()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(stage.current)

    if (reduced) {
      scene.stickyDouble = true
      scene.snapProgress(0)
      scene.snapDouble(false)
      scene.renderOnce()
      return () => {
        ro.disconnect()
        scene.dispose()
        sceneRef.current = null
      }
    }

    // Progress = how far the tall track has scrolled past the sticky stage.
    const onScroll = () => {
      const r = track.current!.getBoundingClientRect()
      const span = r.height - window.innerHeight
      scene.setProgress(span > 0 ? -r.top / span : 0)
    }
    const onPointer = (ev: PointerEvent) => {
      if (ev.pointerType !== 'mouse') return
      scene.setPointer((ev.clientX / window.innerWidth) * 2 - 1, (ev.clientY / window.innerHeight) * 2 - 1)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('pointermove', onPointer, { passive: true })

    let lastActive = -1
    let lastDouble: boolean | null = null
    scene.onFrame = (p, dbl) => {
      panels.current.forEach((el, i) => {
        if (!el) return
        const [a, b, c, d] = beats[i]
        const vin = ramp(a, b, p)
        const vout = clamp01((p - c) / (d - c))
        const o = vin * (1 - vout)
        el.style.opacity = String(o)
        el.style.transform = `translate3d(0, ${((1 - vin) * 28 - vout * 28).toFixed(1)}px, 0)`
        el.style.visibility = o < 0.01 ? 'hidden' : 'visible'
        el.style.pointerEvents = o > 0.6 ? 'auto' : 'none'
      })
      if (rail.current) rail.current.style.transform = `scaleY(${p.toFixed(4)})`
      if (railWrap.current) railWrap.current.style.opacity = String(1 - clamp01((p - 0.82) / 0.08))
      const idx = beats.reduce((acc, [a], i) => (p >= Math.max(0, a) - 0.02 ? i : acc), 0)
      if (idx !== lastActive) setActive((lastActive = idx))
      if (dbl !== lastDouble) setIsDouble((lastDouble = dbl))
    }

    // Only animate while the stage is on screen.
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? scene.start() : scene.stop()))
    io.observe(track.current!)

    return () => {
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('pointermove', onPointer)
      scene.dispose()
      sceneRef.current = null
    }
  }, [gl, reduced])

  const register = (i: number) => (el: HTMLDivElement | null) => {
    panels.current[i] = el
  }

  const choose = (dbl: boolean) => {
    setIsDouble(dbl)
    const s = sceneRef.current
    if (!s) return
    if (immersive) s.setDouble(dbl)
    else {
      s.snapDouble(dbl)
      s.renderOnce()
    }
  }

  return (
    <>
      <section
        ref={track}
        aria-labelledby="burger-title"
        className={['relative bg-charcoal', immersive ? 'h-[380vh] md:h-[480vh]' : ''].join(' ')}
      >
        <div ref={stage} className="sticky top-0 h-svh min-h-[580px] overflow-hidden">
          {/* Spotlight and vignette */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_68%_42%,rgb(201_162_74/0.28),transparent_70%),radial-gradient(ellipse_80%_50%_at_50%_110%,rgb(15_61_34/0.45),transparent_70%)] max-md:bg-[radial-gradient(ellipse_90%_45%_at_50%_34%,rgb(201_162_74/0.3),transparent_70%),radial-gradient(ellipse_100%_40%_at_50%_110%,rgb(15_61_34/0.45),transparent_70%)]"
          />
          <div aria-hidden className="texture-dark absolute inset-0 opacity-60" />

          {gl ? (
            <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full" />
          ) : (
            <div className="absolute inset-0 flex items-start justify-center pt-24 md:items-center md:justify-end md:pr-[6vw] md:pt-0">
              <Picture
                src={burger.image}
                width={800}
                height={597}
                priority
                alt={burger.imageAlt}
                className="w-[min(88vw,40rem)] rounded-3xl shadow-[0_40px_80px_-30px_rgb(0_0_0/0.7)]"
              />
            </div>
          )}

          {/* Layer labels (positioned every frame by the scene) */}
          {immersive && (
            <ul aria-hidden className="pointer-events-none absolute inset-0">
              {labelKeys.map((k) => (
                <li
                  key={k}
                  ref={(el) => {
                    if (el) labels.current[k] = el
                  }}
                  className="absolute left-0 top-0 flex items-center gap-2 opacity-0 will-change-transform"
                >
                  <span className="h-px w-8 bg-gold/80 max-md:w-4" />
                  <span className="whitespace-nowrap rounded-full border border-cream/15 bg-charcoal/75 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-cream backdrop-blur-sm max-md:text-[10px]">
                    {labelText[k]}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Readability scrim for text on small screens */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-charcoal via-charcoal/85 to-transparent md:hidden" />

          {/* Text beats */}
          <div className="absolute inset-0 mx-auto flex max-w-7xl px-5 sm:px-8">
            <div className="relative w-full md:max-w-[28rem] lg:max-w-[32rem]">
              <Beat i={0} register={register} immersive={immersive}>
                <p className="eyebrow text-gold">{site.shortName} · {site.city}</p>
                <h1
                  id="burger-title"
                  className="font-display text-balance mt-5 text-[2.8rem] font-light leading-[0.95] text-cream sm:text-6xl lg:text-[5.2rem]"
                >
                  The Jerk Patty <em className="not-italic text-gold-300">Burger.</em>
                </h1>
                <p className="text-pretty mt-5 max-w-sm text-base leading-relaxed text-cream/80 sm:text-lg">
                  A jerk-seasoned beef patty with lettuce, tomato, and pickles. Fries included.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <a href="#order" className="btn btn-gold">
                    {singlePrice} single · {doublePrice} double
                  </a>
                  <a href="index.html#menu" className="btn btn-ghost">
                    Full menu
                  </a>
                </div>
                {immersive && (
                  <p className="mt-10 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-cream/55 max-md:hidden">
                    Scroll to build it <ArrowDown width={14} height={14} className="motion-ok:animate-bounce" />
                  </p>
                )}
              </Beat>

              {immersive && (
                <>
                  <Beat i={1} register={register} immersive>
                    <p className="eyebrow text-gold">Layer by layer</p>
                    <h2 className="font-display text-balance mt-4 text-5xl font-light leading-[0.95] text-cream lg:text-6xl">
                      Stacked the right way.
                    </h2>
                    <p className="text-pretty mt-5 max-w-sm leading-relaxed text-cream/75">
                      Bun, lettuce, tomato, pickles, and a jerk-seasoned beef patty.
                    </p>
                  </Beat>
                  <Beat i={2} register={register} immersive>
                    <p className="eyebrow text-gold">The patty</p>
                    <h2 className="font-display text-balance mt-4 text-5xl font-light leading-[0.95] text-cream lg:text-6xl">
                      Jerk heat in every bite.
                    </h2>
                    <p className="text-pretty mt-5 max-w-sm leading-relaxed text-cream/75">
                      Beef, seasoned with jerk spice.
                    </p>
                  </Beat>
                  <Beat i={3} register={register} immersive>
                    <p className="eyebrow text-gold">Double meat</p>
                    <h2 className="font-display text-balance mt-4 text-5xl font-light leading-[0.95] text-cream lg:text-6xl">
                      Make it a double.
                    </h2>
                    <p className="mt-5 text-cream/75">
                      <span className="font-display text-4xl text-gold-300">{doublePrice}</span>
                      <span className="ml-3">double meat, fries included</span>
                    </p>
                  </Beat>
                  <Beat i={4} register={register} immersive>
                    <OrderCard isDouble={isDouble} choose={choose} />
                  </Beat>
                </>
              )}
            </div>
          </div>

          {/* Chapter rail */}
          {immersive && (
            <div ref={railWrap} aria-hidden className="absolute right-6 top-1/2 hidden -translate-y-1/2 items-stretch gap-4 lg:flex">
              <ol className="flex flex-col justify-between py-1 text-right text-[11px] font-semibold uppercase tracking-[0.2em]">
                {chapters.map((c, i) => (
                  <li key={c} className={['h-6 transition-colors duration-500', i === active ? 'text-gold' : 'text-cream/30'].join(' ')}>
                    {c}
                  </li>
                ))}
              </ol>
              <div className="relative w-px bg-cream/15">
                <div ref={rail} className="absolute inset-0 origin-top bg-gold" style={{ transform: 'scaleY(0)' }} />
              </div>
            </div>
          )}

          {/* Description for screen readers; the canvas itself is decorative */}
          <p className="sr-only">
            A 3D jerk patty burger on a dark serving board. Scrolling separates it into labelled layers, moves in
            on the jerk-seasoned patty, adds a second patty, and lands fries on the board.
          </p>
        </div>
      </section>

      {/* Static version of the story for reduced motion or no WebGL */}
      {!immersive && (
        <section className="texture-cream text-ink">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 md:grid-cols-2 md:py-28">
            <div>
              <p className="eyebrow text-forest">What's on it</p>
              <h2 className="font-display mt-4 text-5xl font-light leading-[0.98]">Stacked the right way.</h2>
              <ul className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
                {labelKeys.map((k) => (
                  <li key={k} className="py-3 text-lg">{labelText[k]}</li>
                ))}
                <li className="py-3 text-lg">French fries on the side</li>
              </ul>
            </div>
            <div className="self-start">
              <OrderCard isDouble={isDouble} choose={choose} />
            </div>
          </div>
        </section>
      )}
    </>
  )
}

function Beat({
  i,
  register,
  immersive,
  children,
}: {
  i: number
  register: (i: number) => (el: HTMLDivElement | null) => void
  immersive: boolean
  children: React.ReactNode
}) {
  // Outer box handles placement (bottom on phones, centred on desktop);
  // the inner box is what the scroll loop fades and slides.
  return (
    <div className="pointer-events-none absolute inset-0 flex items-end pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:items-center md:pb-0">
      <div
        ref={register(i)}
        className={['w-full will-change-transform', immersive && i > 0 ? 'invisible opacity-0' : 'pointer-events-auto'].join(' ')}
      >
        {children}
      </div>
    </div>
  )
}

function OrderCard({ isDouble, choose }: { isDouble: boolean; choose: (d: boolean) => void }) {
  const options = [
    { dbl: false, label: 'Single', price: singlePrice },
    { dbl: true, label: 'Double meat', price: doublePrice },
  ]
  return (
    <div id="order" className="rounded-[1.5rem] border border-cream/12 bg-charcoal-800/95 p-6 text-cream shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] backdrop-blur-md sm:p-8">
      <p className="eyebrow text-gold">Your order</p>
      <h2 className="font-display mt-3 text-3xl font-light leading-tight sm:text-4xl">{burger.name}</h2>
      <div role="group" aria-label="Choose single or double meat" className="mt-6 grid grid-cols-2 gap-2">
        {options.map((o) => {
          const on = isDouble === o.dbl
          return (
            <button
              key={o.label}
              type="button"
              aria-pressed={on}
              onClick={() => choose(o.dbl)}
              className={[
                'flex min-h-16 cursor-pointer flex-col items-start justify-center rounded-2xl border px-4 py-3 text-left transition-[background-color,border-color,transform] duration-300 ease-out-expo active:scale-[0.98]',
                on ? 'border-gold bg-gold/15' : 'border-cream/15 hover:border-cream/40',
              ].join(' ')}
            >
              <span className="text-sm font-semibold uppercase tracking-[0.14em] text-cream/80">{o.label}</span>
              <span className="font-display text-3xl text-gold-300">{o.price}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-4 text-sm text-cream/65">Includes {burger.includes?.join(', ').replace(/, ([^,]*)$/, ', and $1').toLowerCase()}.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={`tel:${site.phone.e164}`} className="btn btn-gold">
          <Phone /> Call to order
        </a>
        <a href="index.html#menu" className="btn btn-ghost">
          See the full menu
        </a>
      </div>
    </div>
  )
}
