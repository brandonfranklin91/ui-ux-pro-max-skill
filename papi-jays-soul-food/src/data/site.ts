/**
 * Site configuration.
 *
 * Everything in this file is DRAFT content transcribed from the printed flyers
 * and must be confirmed with the owners before publication. See the `verified`
 * flags and README "Before you publish" checklist.
 */

export const site = {
  name: "Papi & Jay's Soul Food",
  shortName: "Papi & Jay's",
  city: 'Tulsa, Oklahoma',
  tagline: 'Big Flavor. Deep Soul.',

  /**
   * The two flyers list two different addresses. Pick the current one and set
   * `verified: true` once confirmed. The site renders the first entry that is
   * marked `active`.
   */
  locations: [
    {
      id: 'memorial',
      label: 'S Memorial Dr',
      street: '1133 S Memorial Dr',
      cityStateZip: 'Tulsa, OK 74112',
      active: false,
      verified: false,
    },
    {
      id: 'e32nd',
      label: 'E 32nd St',
      street: '11320 E 32nd St',
      cityStateZip: 'Tulsa, OK 74145',
      active: true,
      verified: false,
    },
  ],

  /** From the Friday flyer. Confirm before publishing. */
  phone: { display: '918-855-3403', e164: '+19188553403', verified: false },

  /**
   * The Friday flyer lists 11 AM - 8 PM for Friday only. Hours for other days
   * are unknown; leave them `null` and the site says "Call for hours".
   */
  hours: {
    verified: false,
    days: [
      { day: 'Monday', open: null, close: null },
      { day: 'Tuesday', open: null, close: null },
      { day: 'Wednesday', open: null, close: null },
      { day: 'Thursday', open: null, close: null },
      { day: 'Friday', open: '11:00 AM', close: '8:00 PM' },
      { day: 'Saturday', open: null, close: null },
      { day: 'Sunday', open: null, close: null },
    ] as { day: string; open: string | null; close: string | null }[],
  },

  /** No online ordering link has been confirmed. Leave null to use "View Menu". */
  orderUrl: null as string | null,

  social: {
    instagram: null as string | null,
    facebook: null as string | null,
  },
} as const

export function activeLocation() {
  return site.locations.find((l) => l.active) ?? site.locations[0]
}

export function directionsUrl() {
  const l = activeLocation()
  const q = encodeURIComponent(`${l.street}, ${l.cityStateZip}`)
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`
}

export function mapEmbedUrl() {
  const l = activeLocation()
  const q = encodeURIComponent(`${l.street}, ${l.cityStateZip}`)
  return `https://www.google.com/maps?q=${q}&output=embed`
}
