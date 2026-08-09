import type { Metadata } from 'next'
import HeroBanner from '@/components/home/HeroBanner'
import PromoCards from '@/components/home/PromoCards'
import CategoryTabs from '@/components/home/CategoryTabs'
import FeatureIcons from '@/components/home/FeatureIcons'
import GoogleReviews from '@/components/home/GoogleReviews'
import InstagramCarousel from '@/components/home/InstagramCarousel'
import FaqSnippet from '@/components/home/FaqSnippet'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'
import type { Category, Product } from '@/types'

export const metadata: Metadata = {
  title: 'Pizza Expert Prayagraj – Authentic Wood-Fired Pizzeria',
  description:
    'Order fresh wood-fired pizza, burgers, pasta & more from Pizza Expert Prayagraj. Handcrafted daily with 24-hour fermented dough. Rated 4.9★',
}

// Homepage Categories
const HOMEPAGE_CATEGORIES: Category[] = [
  { id: '1', name: 'Pizzas',     slug: 'pizzas',     image_url: null, sort_order: 1, is_active: true },
  { id: '2', name: 'Burgers',    slug: 'burgers',    image_url: null, sort_order: 2, is_active: true },
  { id: '3', name: 'Pasta',      slug: 'pasta',      image_url: null, sort_order: 3, is_active: true },
  { id: '4', name: 'Sides',      slug: 'sides',      image_url: null, sort_order: 4, is_active: true },
  { id: '5', name: 'Beverages',  slug: 'beverages',  image_url: null, sort_order: 5, is_active: true },
  { id: '6', name: 'Combos',     slug: 'combos',     image_url: null, sort_order: 6, is_active: true },
]

// Homepage Products
const PRODUCTS_BY_CATEGORY: Record<string, Product[]> = {
  pizzas: [
    {
      id: 'p1',
      name: 'Margherita Pizza',
      slug: 'margherita-pizza',
      description: 'Classic Italian Margherita with fresh mozzarella, organic tomato passata, and fresh basil leaves.',
      price: 249,
      is_veg: true,
      is_spicy: false,
      is_available: true,
      category_id: '1',
      category: HOMEPAGE_CATEGORIES[0],
      images: [{ id: 'img1', product_id: 'p1', image_url: FOOD_IMAGES['margherita-pizza'], sort_order: 1, is_primary: true }],
      nutrition: null,
      sort_order: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 'p2',
      name: 'Paneer Tikka Pizza',
      slug: 'paneer-tikka-pizza',
      description: 'Marinated paneer cubes, capsicum, red onions, and spicy tikka sauce on a cheesy base.',
      price: 349,
      is_veg: true,
      is_spicy: true,
      is_available: true,
      category_id: '1',
      category: HOMEPAGE_CATEGORIES[0],
      images: [{ id: 'img2', product_id: 'p2', image_url: FOOD_IMAGES['paneer-tikka-pizza'], sort_order: 1, is_primary: true }],
      nutrition: null,
      sort_order: 2,
      created_at: new Date().toISOString(),
    },
    {
      id: 'p3',
      name: 'Chicken Supreme Pizza',
      slug: 'chicken-supreme-pizza',
      description: 'Loaded with juicy grilled chicken, mushrooms, black olives, capsicum, and house sauce.',
      price: 399,
      is_veg: false,
      is_spicy: false,
      is_available: true,
      category_id: '1',
      category: HOMEPAGE_CATEGORIES[0],
      images: [{ id: 'img3', product_id: 'p3', image_url: FOOD_IMAGES['chicken-supreme-pizza'], sort_order: 1, is_primary: true }],
      nutrition: null,
      sort_order: 3,
      created_at: new Date().toISOString(),
    },
  ],
  burgers: [
    {
      id: 'p6',
      name: 'Veg Crispy Burger',
      slug: 'veg-crispy-burger',
      description: 'Crispy veggie patty with lettuce, tomato, cheese slice, and special burger mayo.',
      price: 149,
      is_veg: true,
      is_spicy: false,
      is_available: true,
      category_id: '2',
      category: HOMEPAGE_CATEGORIES[1],
      images: [{ id: 'img6', product_id: 'p6', image_url: FOOD_IMAGES['veg-crispy-burger'], sort_order: 1, is_primary: true }],
      nutrition: null,
      sort_order: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 'p7',
      name: 'Chicken Zinger Burger',
      slug: 'chicken-zinger-burger',
      description: 'Crispy fried chicken fillet with crunchy coleslaw, pickles, and spicy chipotle mayo.',
      price: 199,
      is_veg: false,
      is_spicy: true,
      is_available: true,
      category_id: '2',
      category: HOMEPAGE_CATEGORIES[1],
      images: [{ id: 'img7', product_id: 'p7', image_url: FOOD_IMAGES['chicken-zinger-burger'], sort_order: 1, is_primary: true }],
      nutrition: null,
      sort_order: 2,
      created_at: new Date().toISOString(),
    },
    {
      id: 'p8',
      name: 'Double Chicken Patty Burger',
      slug: 'double-chicken-patty-burger',
      description: 'Two thick grilled chicken patties, double cheddar cheese, and smoky BBQ sauce.',
      price: 259,
      is_veg: false,
      is_spicy: false,
      is_available: true,
      category_id: '2',
      category: HOMEPAGE_CATEGORIES[1],
      images: [{ id: 'img8', product_id: 'p8', image_url: FOOD_IMAGES['double-chicken-patty-burger'], sort_order: 1, is_primary: true }],
      nutrition: null,
      sort_order: 3,
      created_at: new Date().toISOString(),
    },
  ],
  pasta: [
    {
      id: 'p9',
      name: 'Penne Arrabiata',
      slug: 'penne-arrabiata',
      description: 'Italian al dente penne pasta in a spicy garlic tomato sauce with basil and Parmesan.',
      price: 199,
      is_veg: true,
      is_spicy: true,
      is_available: true,
      category_id: '3',
      category: HOMEPAGE_CATEGORIES[2],
      images: [{ id: 'img9', product_id: 'p9', image_url: FOOD_IMAGES['penne-arrabiata'], sort_order: 1, is_primary: true }],
      nutrition: null,
      sort_order: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 'p10',
      name: 'Chicken Alfredo Pasta',
      slug: 'chicken-alfredo-pasta',
      description: 'Creamy white sauce pasta with grilled chicken strips, mushrooms, and Parmesan cheese.',
      price: 249,
      is_veg: false,
      is_spicy: false,
      is_available: true,
      category_id: '3',
      category: HOMEPAGE_CATEGORIES[2],
      images: [{ id: 'img10', product_id: 'p10', image_url: FOOD_IMAGES['chicken-alfredo-pasta'], sort_order: 1, is_primary: true }],
      nutrition: null,
      sort_order: 2,
      created_at: new Date().toISOString(),
    },
  ],
  sides: [
    {
      id: 'p11',
      name: 'Garlic Bread (4 Pcs)',
      slug: 'garlic-bread',
      description: 'Toasted baguette with garlic butter, herbs, and melted mozzarella cheese.',
      price: 99,
      is_veg: true,
      is_spicy: false,
      is_available: true,
      category_id: '4',
      category: HOMEPAGE_CATEGORIES[3],
      images: [{ id: 'img11', product_id: 'p11', image_url: FOOD_IMAGES['garlic-bread'], sort_order: 1, is_primary: true }],
      nutrition: null,
      sort_order: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 'p12',
      name: 'Peri Peri Fries',
      slug: 'peri-peri-fries',
      description: 'Golden crispy french fries tossed in hot peri peri seasoning.',
      price: 119,
      is_veg: true,
      is_spicy: true,
      is_available: true,
      category_id: '4',
      category: HOMEPAGE_CATEGORIES[3],
      images: [{ id: 'img12', product_id: 'p12', image_url: FOOD_IMAGES['peri-peri-fries'], sort_order: 1, is_primary: true }],
      nutrition: null,
      sort_order: 2,
      created_at: new Date().toISOString(),
    },
  ],
  beverages: [
    {
      id: 'p14',
      name: 'Coca-Cola (330ml)',
      slug: 'coca-cola-330ml',
      description: 'Ice-cold Coca-Cola can — the perfect companion for your pizza.',
      price: 60,
      is_veg: true,
      is_spicy: false,
      is_available: true,
      category_id: '5',
      category: HOMEPAGE_CATEGORIES[4],
      images: [{ id: 'img14', product_id: 'p14', image_url: FOOD_IMAGES['coca-cola-330ml'], sort_order: 1, is_primary: true }],
      nutrition: null,
      sort_order: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 'p15',
      name: 'Mango Lassi',
      slug: 'mango-lassi',
      description: 'Thick, chilled mango lassi made with fresh yogurt and mango pulp.',
      price: 89,
      is_veg: true,
      is_spicy: false,
      is_available: true,
      category_id: '5',
      category: HOMEPAGE_CATEGORIES[4],
      images: [{ id: 'img15', product_id: 'p15', image_url: FOOD_IMAGES['mango-lassi'], sort_order: 1, is_primary: true }],
      nutrition: null,
      sort_order: 2,
      created_at: new Date().toISOString(),
    },
  ],
  combos: [
    {
      id: 'p13',
      name: 'Family Feast Combo',
      slug: 'family-feast-combo',
      description: '2 Large Pizzas + Garlic Bread + 4 Coca-Colas. Perfect for family gatherings!',
      price: 899,
      is_veg: true,
      is_spicy: false,
      is_available: true,
      category_id: '6',
      category: HOMEPAGE_CATEGORIES[5],
      images: [{ id: 'img13', product_id: 'p13', image_url: FOOD_IMAGES['family-feast-combo'], sort_order: 1, is_primary: true }],
      nutrition: null,
      sort_order: 1,
      created_at: new Date().toISOString(),
    },
  ],
}

// JSON-LD Schema
const restaurantSchema = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: 'Pizza Expert Prayagraj',
  image: FOOD_IMAGES['hero-pizza'],
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  telephone: '+91-9999999999',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Allapur',
    addressLocality: 'Prayagraj',
    addressRegion: 'Uttar Pradesh',
    postalCode: '211006',
    addressCountry: 'IN',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 25.4358,
    longitude: 81.8463,
  },
  servesCuisine: ['Pizza', 'Italian', 'Fast Food', 'Burgers'],
  priceRange: '₹₹',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '500',
    bestRating: '5',
  },
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday'], opens: '11:00', closes: '23:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday','Sunday'], opens: '10:00', closes: '23:30' },
  ],
}

export default async function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantSchema) }}
      />

      {/* 1. Dark Hero Section */}
      <HeroBanner />

      {/* 2. Light Menu Section */}
      <CategoryTabs
        categories={HOMEPAGE_CATEGORIES}
        productsByCategory={PRODUCTS_BY_CATEGORY}
      />

      {/* 3. Surface Offers Section */}
      <PromoCards />

      {/* 4. Subtle Brand Story Section */}
      <FeatureIcons />

      {/* 5. Dark Social Proof Section */}
      <GoogleReviews />

      {/* Instagram Carousel (Toggleable from settings) */}
      <InstagramCarousel />

      {/* 6. Light FAQ Section */}
      <FaqSnippet />
    </>
  )
}
