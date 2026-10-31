# Papi & Jay's Soul Food

One-page restaurant site for Papi & Jay's Soul Food in Tulsa, Oklahoma.
Built with React, Tailwind CSS v4, and GSAP ScrollTrigger on Vite.

## Preview it

```bash
cd papi-jays-soul-food
npm install
npm run dev        # http://localhost:5173, with the yellow draft reminder
```

To see exactly what visitors will get:

```bash
npm run build
npm run preview    # http://localhost:4173
```

The `dist/` folder from `npm run build` is a static site. Any static host
(Netlify, Vercel, Cloudflare Pages, GitHub Pages) can serve it as-is.

## Before you publish

Everything below came from the printed flyers and has **not** been confirmed.
All of it lives in `src/data/site.ts` and `src/data/menu.ts`.

- [ ] **Address.** The flyers list two: `1133 S Memorial Dr` and
      `11320 E 32nd St`. Set `active: true` on the right one, `false` on the
      other, and `verified: true` once confirmed.
- [ ] **Phone.** `918-855-3403` is from the Friday flyer. Confirm, then set
      `verified: true`.
- [ ] **Hours.** Only Friday (11 AM to 8 PM) is known. Fill in the other days
      or leave them `null` so the site says "Call for hours".
- [ ] **Prices and specials.** Every price, the Friday gumbo, and the add-ons
      are drafts. Edit `src/data/menu.ts`.
- [ ] **Online ordering.** None is linked. If one exists, set `orderUrl`.
- [ ] **Food photos.** The images in `public/food/` are AI-generated stand-ins
      for each menu item. Replace them with real photos when available, keeping
      the same file names (`.avif` and `.webp`, plus `-sm` versions at 480px
      wide for menu cards).

## What's where

| Area | File |
|---|---|
| Contact details, hours, address | `src/data/site.ts` |
| Menu items, wing flavors, Friday special | `src/data/menu.ts` |
| Scroll-animated gumbo hero | `src/components/Hero.tsx` |
| Menu grid and wing flavor filter | `src/components/MenuSection.tsx` |
| Friday gumbo feature | `src/components/FridayFeature.tsx` |
| Logo and motto | `src/components/BrandMoment.tsx` |
| Location, hours, map | `src/components/Visit.tsx` |
| Colors and fonts | `src/index.css` |

## Accessibility and motion

- Visitors who turn on "reduce motion" get a static hero and no scroll
  animations. Everything is visible without scrolling effects.
- All navigation works by keyboard, with visible gold focus rings.
- Images reserve their space before loading, and everything below the hero
  loads lazily.
