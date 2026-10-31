import { activeLocation, directionsUrl, site } from '../data/site'

const year = new Date().getFullYear()

export function Footer() {
  const loc = activeLocation()
  return (
    <footer className="bg-charcoal pb-28 text-cream md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-12 md:py-20">
        <div className="md:col-span-5">
          <img
            src="/brand/logo-lion-chef-sm.png"
            width={478}
            height={372}
            alt={`${site.name} logo`}
            loading="lazy"
            decoding="async"
            className="h-20 w-auto"
          />
          <p className="font-display mt-6 text-2xl font-light text-cream/90">{site.tagline}</p>
        </div>

        <nav aria-label="Footer" className="md:col-span-3">
          <h2 className="eyebrow text-gold">Explore</h2>
          <ul className="mt-4 space-y-2 text-cream/80">
            <li><a className="hover:text-cream" href="#menu">Menu</a></li>
            <li><a className="hover:text-cream" href="#friday">Friday Special</a></li>
            <li><a className="hover:text-cream" href="#visit">Visit Us</a></li>
          </ul>
        </nav>

        <div className="md:col-span-4">
          <h2 className="eyebrow text-gold">Find us</h2>
          <address className="mt-4 space-y-2 not-italic text-cream/80">
            <a className="block hover:text-cream" href={directionsUrl()} target="_blank" rel="noopener noreferrer">
              {loc.street}, {loc.cityStateZip}
            </a>
            <a className="block hover:text-cream" href={`tel:${site.phone.e164}`}>
              {site.phone.display}
            </a>
          </address>
        </div>
      </div>
      <div className="border-t border-cream/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-cream/50 sm:flex-row sm:justify-between sm:px-8">
          <p>© {year} {site.name}. {site.city}.</p>
          <p>Menu prices and specials are subject to change.</p>
        </div>
      </div>
    </footer>
  )
}
