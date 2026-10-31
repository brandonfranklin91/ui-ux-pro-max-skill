/**
 * DRAFT menu transcribed from the printed flyers. Prices and specials await
 * confirmation from the owners before publication.
 */

export type WingFlavor =
  | 'Jerk'
  | 'Buffalo'
  | 'Barbecue'
  | 'Hot Honey'
  | 'Garlic Parmesan'
  | 'Lemon Pepper'

export const wingFlavors: { name: WingFlavor; note: string }[] = [
  { name: 'Jerk', note: 'Island spice, slow heat' },
  { name: 'Buffalo', note: 'Classic cayenne kick' },
  { name: 'Barbecue', note: 'Sweet, smoky, sticky' },
  { name: 'Hot Honey', note: 'Heat with a honey finish' },
  { name: 'Garlic Parmesan', note: 'Buttery, savory, rich' },
  { name: 'Lemon Pepper', note: 'Bright and peppery' },
]

export type MenuCategory = 'Loaded' | 'Dinners' | 'Wings' | 'Burgers'

export interface MenuItem {
  id: string
  name: string
  category: MenuCategory
  price: string
  priceNote?: string
  description: string
  includes?: string[]
  proteins?: string[]
  image: string
  imageAlt: string
  /** Present on wing items so flavor chips can filter / reveal. */
  flavors?: WingFlavor[]
  featured?: boolean
}

export const menu: MenuItem[] = [
  {
    id: 'loaded-fries',
    name: 'Loaded Fries',
    category: 'Loaded',
    price: '$20',
    priceNote: 'starting at',
    description:
      'Crispy fries buried under melted cheese, your choice of protein, and the works.',
    proteins: ['Ground Beef', 'Chicken'],
    image: '/food/loaded-fries',
    imageAlt: 'Loaded fries topped with cheese sauce, seasoned beef, tomato, and green onion',
    featured: true,
  },
  {
    id: 'loaded-nachos',
    name: 'Loaded Nachos',
    category: 'Loaded',
    price: '$20',
    priceNote: 'starting at',
    description:
      'A full plate of chips layered with cheese, protein, jalapeños, and sour cream.',
    proteins: ['Ground Beef', 'Chicken'],
    image: '/food/loaded-nachos',
    imageAlt: 'Loaded nachos with melted cheese, seasoned beef, jalapeños, and sour cream',
  },
  {
    id: 'fish-dinner',
    name: 'Fish Dinner',
    category: 'Dinners',
    price: '$20',
    description: 'Three golden fried fillets, cooked to order, with fries and bread.',
    includes: ['3 fish fillets', 'French fries', 'Bread'],
    image: '/food/fish-dinner',
    imageAlt: 'Three fried fish fillets with French fries, bread, and a lemon wedge',
  },
  {
    id: 'wings-8',
    name: 'Eight-Piece Wing Dinner',
    category: 'Wings',
    price: '$15',
    description: 'Eight wings tossed in the sauce you want, served with fries.',
    includes: ['8 wings', 'French fries'],
    flavors: ['Jerk', 'Buffalo', 'Barbecue', 'Hot Honey', 'Garlic Parmesan', 'Lemon Pepper'],
    image: '/food/wings-dinner',
    imageAlt: 'Glazed chicken wings with French fries',
    featured: true,
  },
  {
    id: 'wings-10',
    name: 'Ten-Piece Wing Dinner',
    category: 'Wings',
    price: '$20',
    description: 'Ten wings, any flavor on the board, served with fries.',
    includes: ['10 wings', 'French fries'],
    flavors: ['Jerk', 'Buffalo', 'Barbecue', 'Hot Honey', 'Garlic Parmesan', 'Lemon Pepper'],
    image: '/food/wings-platter',
    imageAlt: 'A platter of chicken wings in six different flavors',
  },
  {
    id: 'beef-link',
    name: 'Beef Link Dinner',
    category: 'Dinners',
    price: '$15',
    description: 'Smoked beef links off the grill with fries and bread.',
    includes: ['French fries', 'Bread'],
    image: '/food/beef-link',
    imageAlt: 'Grilled beef sausage links with French fries and bread',
  },
  {
    id: 'jerk-burger',
    name: 'Beef Jerk Patty Burger Combo',
    category: 'Burgers',
    price: '$10',
    priceNote: 'single · $15 double meat',
    description:
      'Jerk-seasoned beef patty with lettuce, tomato, and pickles. Fries included.',
    includes: ['Lettuce', 'Tomatoes', 'Pickles', 'French fries'],
    image: '/food/jerk-burger',
    imageAlt: 'Jerk-seasoned beef patty cheeseburger with fries',
  },
]

export const fridaySpecial = {
  title: 'Gumbo Bowl',
  price: '$20',
  description: 'Four meats in one bowl: chicken, beef link, shrimp, and crab.',
  meats: ['Chicken', 'Beef Link', 'Shrimp', 'Crab'],
  addOns: [
    { name: 'Additional fish', price: '$5', note: 'per fillet' },
    { name: 'Strawberry lemonade', price: '$5', note: '12 oz bottle' },
  ],
  image: '/food/gumbo-friday',
  imageAlt: 'Seafood gumbo bowl with chicken, beef link, shrimp, crab, and rice',
}
