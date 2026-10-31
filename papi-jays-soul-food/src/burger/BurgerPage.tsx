import { menu } from '../data/menu'
import { site } from '../data/site'
import { useScrolled } from '../hooks/useScrolled'
import { Footer } from '../components/Footer'
import { MobileMenuBar } from '../components/MobileMenuBar'
import { Picture } from '../components/Picture'
import { ArrowRight, Phone } from '../components/Icons'
import { BurgerExperience } from './BurgerExperience'

const more = ['wings-8', 'loaded-fries', 'fish-dinner']
  .map((id) => menu.find((m) => m.id === id))
  .filter((m): m is (typeof menu)[number] => !!m)

function BurgerHeader() {
  const scrolled = useScrolled(40)
  return (
    <header
      className={[
        'fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-500 ease-out-expo',
        scrolled ? 'bg-charcoal/90 shadow-[0_1px_0_rgb(244_236_220/0.08)] backdrop-blur-md' : 'bg-transparent',
      ].join(' ')}
    >
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-20 sm:px-8">
        <a href="index.html" className="rounded-sm" aria-label={`${site.name} home`}>
          <img
            src="/brand/logo-lion-chef-sm.png"
            width={478}
            height={372}
            alt=""
            className="h-11 w-auto drop-shadow-[0_2px_6px_rgb(0_0_0/0.5)] sm:h-14"
          />
        </a>
        <ul className="hidden items-center gap-9 md:flex">
          {[
            ['index.html#menu', 'Menu'],
            ['index.html#friday', 'Friday Special'],
            ['index.html#visit', 'Visit Us'],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="text-[13px] font-semibold uppercase tracking-[0.18em] text-cream/85 transition-colors hover:text-cream">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <a
            href={`tel:${site.phone.e164}`}
            className="hidden h-11 w-11 items-center justify-center rounded-full text-cream/85 hover:bg-cream/10 hover:text-cream sm:inline-flex"
            aria-label={`Call ${site.phone.display}`}
          >
            <Phone />
          </a>
          <a href="index.html#menu" className="btn btn-gold min-h-11 px-5">
            View Menu
          </a>
        </div>
      </nav>
    </header>
  )
}

export function BurgerPage() {
  return (
    <>
      <BurgerHeader />
      <main>
        <BurgerExperience />

        <section aria-labelledby="more-title" className="texture-cream relative z-10 text-ink">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow text-forest">Also on the menu</p>
                <h2 id="more-title" className="font-display mt-4 text-5xl font-light leading-[0.98] sm:text-6xl">
                  Bring an appetite.
                </h2>
              </div>
              <a href="index.html#menu" className="btn btn-outline-ink">
                See the full menu <ArrowRight />
              </a>
            </div>
            <ul className="mt-12 grid gap-6 sm:grid-cols-3">
              {more.map((m) => (
                <li key={m.id}>
                  <a
                    href="index.html#menu"
                    className="group block overflow-hidden rounded-2xl bg-white shadow-card transition-[box-shadow,transform] duration-500 ease-out-expo hover:-translate-y-1 hover:shadow-card-hover"
                  >
                    <Picture
                      src={m.image}
                      width={800}
                      height={597}
                      responsive
                      sizes="(min-width: 640px) 33vw, 100vw"
                      alt={m.imageAlt}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
                    />
                    <span className="flex items-baseline justify-between gap-4 p-5">
                      <span className="font-display text-2xl">{m.name}</span>
                      <span className="font-display text-2xl text-forest">{m.price}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer base="index.html" />
      <MobileMenuBar menuHref="index.html#menu" />
    </>
  )
}
