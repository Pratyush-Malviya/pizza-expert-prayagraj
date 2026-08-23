import { FOOD_IMAGES } from '@/lib/constants/foodImages'

export interface FallbackCategory {
  id: string
  name: string
  slug: string
  imageUrl: string
  productCount: number
}

export interface FallbackProduct {
  id: string
  name: string
  slug: string
  description: string
  price: number
  imageUrl: string
  isVeg: boolean
  isSpicy: boolean
  categoryId: string
}

export const FALLBACK_CATEGORIES: FallbackCategory[] = [
  {
    id: 'cat-pizzas',
    name: 'Artisanal Pizzas',
    slug: 'pizzas',
    imageUrl: FOOD_IMAGES['margherita-pizza'] || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    productCount: 5,
  },
  {
    id: 'cat-burgers',
    name: 'Gourmet Burgers',
    slug: 'burgers',
    imageUrl: FOOD_IMAGES['chicken-zinger-burger'] || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    productCount: 3,
  },
  {
    id: 'cat-pasta',
    name: 'Italian Pasta',
    slug: 'pasta',
    imageUrl: FOOD_IMAGES['penne-arrabiata'] || 'https://images.unsplash.com/photo-1621996346565-e3d5d6281696?auto=format&fit=crop&w=800&q=80',
    productCount: 2,
  },
  {
    id: 'cat-sides',
    name: 'Sides & Garlic Breads',
    slug: 'sides',
    imageUrl: FOOD_IMAGES['garlic-bread'] || 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=800&q=80',
    productCount: 3,
  },
  {
    id: 'cat-beverages',
    name: 'Chilled Beverages',
    slug: 'beverages',
    imageUrl: FOOD_IMAGES['mango-lassi'] || 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    productCount: 3,
  },
  {
    id: 'cat-combos',
    name: 'Value Combos & Feasts',
    slug: 'combos',
    imageUrl: FOOD_IMAGES['family-feast-combo'] || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    productCount: 2,
  },
]

export const FALLBACK_PRODUCTS: FallbackProduct[] = [
  // Pizzas
  {
    id: 'p1',
    name: 'Margherita Pizza',
    slug: 'margherita-pizza',
    description: 'Classic Italian Margherita with fresh mozzarella, organic tomato passata, and fresh basil leaves on a 48h slow-fermented crust.',
    price: 249,
    imageUrl: FOOD_IMAGES['margherita-pizza'] || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    isSpicy: false,
    categoryId: 'cat-pizzas',
  },
  {
    id: 'p2',
    name: 'Paneer Tikka Pizza',
    slug: 'paneer-tikka-pizza',
    description: 'Tandoori-spiced paneer cubes, crisp bell peppers, red onions, and mozzarella on a smoky sauce base.',
    price: 349,
    imageUrl: FOOD_IMAGES['paneer-tikka-pizza'] || 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    isSpicy: true,
    categoryId: 'cat-pizzas',
  },
  {
    id: 'p3',
    name: 'Farmhouse Veggie Pizza',
    slug: 'farmhouse-pizza',
    description: 'Loaded with crunchy capsicum, sweet corn, mushrooms, red onions, and 100% real mozzarella cheese.',
    price: 329,
    imageUrl: FOOD_IMAGES['farmhouse-pizza'] || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    isSpicy: false,
    categoryId: 'cat-pizzas',
  },
  {
    id: 'p4',
    name: 'Chicken Supreme Pizza',
    slug: 'chicken-supreme-pizza',
    description: 'Loaded with juicy grilled chicken breast, button mushrooms, black olives, capsicum, and house garlic sauce.',
    price: 399,
    imageUrl: FOOD_IMAGES['chicken-supreme-pizza'] || 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=80',
    isVeg: false,
    isSpicy: false,
    categoryId: 'cat-pizzas',
  },
  {
    id: 'p5',
    name: 'Pepperoni Classic Pizza',
    slug: 'pepperoni-pizza',
    description: 'Generous layers of premium cured pepperoni slices, spicy marinara, and double melted mozzarella cheese.',
    price: 449,
    imageUrl: FOOD_IMAGES['pepperoni-pizza'] || 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
    isVeg: false,
    isSpicy: true,
    categoryId: 'cat-pizzas',
  },

  // Burgers
  {
    id: 'p6',
    name: 'Veg Crispy Burger',
    slug: 'veg-crispy-burger',
    description: 'Crisp golden veggie patty topped with fresh iceberg lettuce, tomato slice, creamy house mayo, and cheese.',
    price: 149,
    imageUrl: FOOD_IMAGES['veg-crispy-burger'] || 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    isSpicy: false,
    categoryId: 'cat-burgers',
  },
  {
    id: 'p7',
    name: 'Crispy Chicken Zinger Burger',
    slug: 'chicken-zinger-burger',
    description: 'Ultra-crispy fried chicken thigh fillet, spicy chipotle mayo, melted cheese slice, and fresh shredded lettuce.',
    price: 199,
    imageUrl: FOOD_IMAGES['chicken-zinger-burger'] || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    isVeg: false,
    isSpicy: true,
    categoryId: 'cat-burgers',
  },
  {
    id: 'p8',
    name: 'Double Cheese Paneer Burger',
    slug: 'paneer-burger',
    description: 'Thick marinated cottage cheese patty pan-seared with herb seasonings, double cheddar, and garlic mayo.',
    price: 189,
    imageUrl: FOOD_IMAGES['paneer-burger'] || 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    isSpicy: false,
    categoryId: 'cat-burgers',
  },

  // Pasta
  {
    id: 'p9',
    name: 'Penne Arrabiata',
    slug: 'penne-arrabiata',
    description: 'Al dente penne tossed in a spicy garlic tomato marinara with fresh basil, chili flakes, and extra virgin olive oil.',
    price: 229,
    imageUrl: FOOD_IMAGES['penne-arrabiata'] || 'https://images.unsplash.com/photo-1621996346565-e3d5d6281696?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    isSpicy: true,
    categoryId: 'cat-pasta',
  },
  {
    id: 'p10',
    name: 'Creamy Alfredo Pasta',
    slug: 'creamy-alfredo-pasta',
    description: 'Rich and velvety Parmesan cream sauce with sautéed mushrooms, herbs, and garlic-infused olive oil.',
    price: 269,
    imageUrl: FOOD_IMAGES['penne-arrabiata'] || 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    isSpicy: false,
    categoryId: 'cat-pasta',
  },

  // Sides
  {
    id: 'p11',
    name: 'Stuffed Garlic Bread',
    slug: 'garlic-bread',
    description: 'Freshly baked buttery loaf loaded with melted mozzarella, sweet corn, green chilies, and aromatic Italian herbs.',
    price: 139,
    imageUrl: FOOD_IMAGES['garlic-bread'] || 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    isSpicy: false,
    categoryId: 'cat-sides',
  },
  {
    id: 'p12',
    name: 'Peri Peri French Fries',
    slug: 'peri-peri-fries',
    description: 'Golden crispy potato fries tossed in fiery African peri-peri spice mix. Served with cheesy jalapeno dip.',
    price: 119,
    imageUrl: FOOD_IMAGES['garlic-bread'] || 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    isSpicy: true,
    categoryId: 'cat-sides',
  },
  {
    id: 'p13',
    name: 'Crispy Cheese Balls',
    slug: 'cheese-balls',
    description: 'Crispy breaded bite-sized appetizers packed with gooey melted cheese, jalapenos, and herbs.',
    price: 159,
    imageUrl: FOOD_IMAGES['garlic-bread'] || 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    isSpicy: false,
    categoryId: 'cat-sides',
  },

  // Beverages
  {
    id: 'p14',
    name: 'Royal Mango Lassi',
    slug: 'mango-lassi',
    description: 'Thick, creamy yogurt shake prepared with sweet Alphonso mango pulp and a hint of green cardamom.',
    price: 99,
    imageUrl: FOOD_IMAGES['mango-lassi'] || 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    isSpicy: false,
    categoryId: 'cat-beverages',
  },
  {
    id: 'p15',
    name: 'Chilled Cold Coffee',
    slug: 'cold-coffee',
    description: 'Rich dark espresso blended with creamy whole milk and vanilla ice cream, topped with cocoa dusting.',
    price: 129,
    imageUrl: FOOD_IMAGES['mango-lassi'] || 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    isSpicy: false,
    categoryId: 'cat-beverages',
  },
  {
    id: 'p16',
    name: 'Thums Up (750ml)',
    slug: 'thums-up-can',
    description: 'Classic strong and fizzy cola, served chilled with your favorite wood-fired pizza.',
    price: 50,
    imageUrl: FOOD_IMAGES['mango-lassi'] || 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    isSpicy: false,
    categoryId: 'cat-beverages',
  },

  // Combos
  {
    id: 'p17',
    name: 'Family Feast Combo',
    slug: 'family-feast-combo',
    description: '2 Medium Wood-Fired Pizzas + 1 Stuffed Garlic Bread + 1 Large Thums Up (750ml). Saves ₹180.',
    price: 699,
    imageUrl: FOOD_IMAGES['family-feast-combo'] || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    isSpicy: false,
    categoryId: 'cat-combos',
  },
  {
    id: 'p18',
    name: 'Party Burger Combo',
    slug: 'party-burger-combo',
    description: '2 Crispy Burgers + 1 Large Peri-Peri Fries + 2 Cold Coffees.',
    price: 499,
    imageUrl: FOOD_IMAGES['family-feast-combo'] || 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80',
    isVeg: true,
    isSpicy: false,
    categoryId: 'cat-combos',
  },
]
