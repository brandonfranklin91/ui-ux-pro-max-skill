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

## 3D burger landing page

`burger.html` is a second page: an immersive, scroll-driven 3D landing page for
the Beef Jerk Patty Burger, built with three.js. Open it at
`http://localhost:5173/burger.html` (dev) or `/burger.html` on the built site.
The burger card on the main menu links to it ("See it built in 3D").

Scrolling plays five beats: the whole burger turning under a spotlight, the
layers separating with labels, a close-up of the jerk patty, a second patty
for the double, and an order card with a single/double toggle as fries land
on the board.

- The burger is modelled in code (`src/burger/BurgerScene.ts`), so there are
  no 3D files to download. Textures are drawn at load time
  (`src/burger/textures.ts`).
- Prices and ingredients come from `src/data/menu.ts`, the same source as the
  main menu.
- With reduced motion turned on, the page shows a still 3D render and the full
  story as plain text. Browsers without WebGL see the burger photo instead.
- three.js loads only on this page, so the main site stays light.

To make it the site's front page, set your host to serve `burger.html` at `/`
(most static hosts call this a rewrite or redirect rule). Its links already
point back to `index.html` for the full menu.

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
| 3D burger landing page | `src/burger/` and `burger.html` |
| Colors and fonts | `src/index.css` |

## Accessibility and motion

- Visitors who turn on "reduce motion" get a static hero and no scroll
  animations. Everything is visible without scrolling effects.
- All navigation works by keyboard, with visible gold focus rings.
- Images reserve their space before loading, and everything below the hero
  loads lazily.
