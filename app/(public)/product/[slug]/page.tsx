'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Minus, ShoppingCart, Star, ArrowLeft, Flame, ShieldCheck, Truck } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'
import { FOOD_IMAGES } from '@/lib/constants/foodImages'
import { toast } from 'sonner'
import type { CartItemOption, ProductOption, OptionChoice } from '@/types'

const FULL_PRODUCTS_DATABASE: Record<string, {
  id: string
  name: string
  slug: string
  category: string
  categoryName: string
  description: string
  price: number
  is_veg: boolean
  is_spicy: boolean
  ingredients: string
  nutrition: Record<string, string>
  options?: ProductOption[]
}> = {
  'margherita-pizza': {
    id: 'p1',
    name: 'Margherita Pizza',
    slug: 'margherita-pizza',
    category: 'pizzas',
    categoryName: 'Pizzas',
    description: 'Classic Italian Margherita with organic tomato passata, fresh mozzarella, and aromatic basil leaves on our signature hand-tossed crust.',
    price: 249,
    is_veg: true,
    is_spicy: false,
    ingredients: 'Fresh Mozzarella, Organic Tomato Sauce, Fresh Basil Leaves, Extra Virgin Olive Oil, Hand-tossed Wheat Crust.',
    nutrition: { calories: '260 kcal / slice', protein: '12g', carbs: '32g', fat: '10g' },
    options: [
      { id: 'o1', name: 'Size', choices: [{ label: 'Regular (8")', price_delta: 0 }, { label: 'Medium (10")', price_delta: 80 }, { label: 'Large (12")', price_delta: 150 }] },
      { id: 'o2', name: 'Crust', choices: [{ label: 'Thin Crust', price_delta: 0 }, { label: 'Cheese Burst', price_delta: 60 }, { label: 'Stuffed Crust', price_delta: 50 }] },
    ],
  },
  'paneer-tikka-pizza': {
    id: 'p2',
    name: 'Paneer Tikka Pizza',
    slug: 'paneer-tikka-pizza',
    category: 'pizzas',
    categoryName: 'Pizzas',
    description: 'Tender marinated paneer cubes, capsicum, onion, and spicy tikka masala sauce on a cheesy base.',
    price: 349,
    is_veg: true,
    is_spicy: true,
    ingredients: 'Paneer Tikka Cubes, Tikka Masala Sauce, Green Capsicum, Red Onions, Mozzarella Cheese.',
    nutrition: { calories: '310 kcal / slice', protein: '15g', carbs: '34g', fat: '14g' },
    options: [
      { id: 'o3', name: 'Size', choices: [{ label: 'Regular (8")', price_delta: 0 }, { label: 'Medium (10")', price_delta: 80 }, { label: 'Large (12")', price_delta: 150 }] },
      { id: 'o4', name: 'Crust', choices: [{ label: 'Thin Crust', price_delta: 0 }, { label: 'Cheese Burst', price_delta: 60 }] },
    ],
  },
  'chicken-supreme-pizza': {
    id: 'p3',
    name: 'Chicken Supreme Pizza',
    slug: 'chicken-supreme-pizza',
    category: 'pizzas',
    categoryName: 'Pizzas',
    description: 'Loaded with juicy grilled chicken, mushrooms, black olives, capsicum, and house pizza sauce.',
    price: 399,
    is_veg: false,
    is_spicy: false,
    ingredients: 'Grilled Chicken Breast, Mushroom, Black Olives, Bell Peppers, House Pizza Sauce, Mozzarella.',
    nutrition: { calories: '340 kcal / slice', protein: '19g', carbs: '33g', fat: '15g' },
    options: [
      { id: 'o5', name: 'Size', choices: [{ label: 'Regular (8")', price_delta: 0 }, { label: 'Medium (10")', price_delta: 80 }, { label: 'Large (12")', price_delta: 150 }] },
      { id: 'o6', name: 'Crust', choices: [{ label: 'Thin Crust', price_delta: 0 }, { label: 'Cheese Burst', price_delta: 60 }] },
    ],
  },
  'farm-house-pizza': {
    id: 'p4',
    name: 'Farm House Pizza',
    slug: 'farm-house-pizza',
    category: 'pizzas',
    categoryName: 'Pizzas',
    description: 'Crispy farm fresh vegetables including capsicum, onion, tomato, and golden corn on a cheesy tomato base.',
    price: 299,
    is_veg: true,
    is_spicy: false,
    ingredients: 'Green Capsicum, Red Onions, Juicy Tomatoes, Sweet Golden Corn, Mozzarella Cheese.',
    nutrition: { calories: '275 kcal / slice', protein: '11g', carbs: '35g', fat: '11g' },
    options: [
      { id: 'o7', name: 'Size', choices: [{ label: 'Regular (8")', price_delta: 0 }, { label: 'Medium (10")', price_delta: 80 }, { label: 'Large (12")', price_delta: 150 }] },
    ],
  },
  'veg-crispy-burger': {
    id: 'p6',
    name: 'Veg Crispy Burger',
    slug: 'veg-crispy-burger',
    category: 'burgers',
    categoryName: 'Burgers',
    description: 'Crispy breaded veggie patty loaded with fresh lettuce, tomato slices, melted cheese slice, and creamy burger mayo in a toasted bun.',
    price: 149,
    is_veg: true,
    is_spicy: false,
    ingredients: 'Crispy Vegetable Patty, Toasted Bun, Lettuce, Tomato, Cheese Slice, Creamy Mayo.',
    nutrition: { calories: '380 kcal', protein: '10g', carbs: '52g', fat: '16g' },
    options: [
      { id: 'b1', name: 'Add Cheese', choices: [{ label: 'Standard Cheese', price_delta: 0 }, { label: 'Extra Cheese Slice', price_delta: 25 }] },
    ],
  },
  'chicken-zinger-burger': {
    id: 'p7',
    name: 'Chicken Zinger Burger',
    slug: 'chicken-zinger-burger',
    category: 'burgers',
    categoryName: 'Burgers',
    description: 'Juicy, crispy fried chicken fillet tossed in spicy secret rub, topped with coleslaw, pickles, and spicy chipotle mayo in a toasted bun.',
    price: 199,
    is_veg: false,
    is_spicy: true,
    ingredients: 'Crispy Fried Chicken Fillet, Toasted Bun, Coleslaw, Dill Pickles, Chipotle Mayo.',
    nutrition: { calories: '490 kcal', protein: '28g', carbs: '48g', fat: '22g' },
    options: [
      { id: 'b3', name: 'Spice Level', choices: [{ label: 'Medium Spicy', price_delta: 0 }, { label: 'Extra Spicy Fire', price_delta: 15 }] },
    ],
  },
}

export default function ProductDetailPage() {
  const params = useParams()
  const rawSlug = (params?.slug as string) || 'margherita-pizza'

  const product = FULL_PRODUCTS_DATABASE[rawSlug] || {
    id: 'p-custom',
    name: rawSlug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    slug: rawSlug,
    category: 'pizzas',
    categoryName: 'Menu Item',
    description: `Delicious freshly prepared ${rawSlug.replace(/-/g, ' ')} crafted with the finest ingredients in Prayagraj.`,
    price: 249,
    is_veg: !rawSlug.includes('chicken'),
    is_spicy: rawSlug.includes('spicy') || rawSlug.includes('peri') || rawSlug.includes('arrabiata') || rawSlug.includes('zinger'),
    ingredients: 'Fresh local ingredients, secret spices, house sauces.',
    nutrition: { calories: '320 kcal', protein: '14g', carbs: '38g', fat: '12g' },
    options: [
      { id: 'custom-opt-1', name: 'Choice', choices: [{ label: 'Standard Portion', price_delta: 0 }, { label: 'Large Portion', price_delta: 60 }] },
    ],
  }

  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)

  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, { choice: string; priceDelta: number }>>(() => {
    const initial: Record<string, { choice: string; priceDelta: number }> = {}
    product.options?.forEach((opt: ProductOption) => {
      if (opt.choices[0]) {
        initial[opt.name] = {
          choice: opt.choices[0].label,
          priceDelta: opt.choices[0].price_delta,
        }
      }
    })
    return initial
  })

  const optionsDelta = Object.values(selectedOptions).reduce((sum, o) => sum + o.priceDelta, 0)
  const unitPrice = product.price + optionsDelta
  const totalPrice = unitPrice * quantity

  const handleOptionSelect = (optionName: string, choiceLabel: string, priceDelta: number) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: { choice: choiceLabel, priceDelta },
    }))
  }

  const handleAddToCart = () => {
    const formattedOptions: CartItemOption[] = Object.entries(selectedOptions).map(([optionName, val]) => ({
      optionName,
      choice: val.choice,
      priceDelta: val.priceDelta,
    }))

    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      imageUrl: FOOD_IMAGES[product.slug] || FOOD_IMAGES['margherita-pizza'],
      isVeg: product.is_veg,
      quantity,
      selectedOptions: formattedOptions,
    })

    toast.success(`Added ${quantity}x ${product.name} to cart`, {
      action: {
        label: 'View Cart',
        onClick: () => openCart(),
      },
    })
  }

  const productImage = FOOD_IMAGES[product.slug] || FOOD_IMAGES['margherita-pizza']

  return (
    <div className="bg-[#FBF9F5] min-h-screen py-10 sm:py-14">
      <div className="container-custom">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <Link href="/menu" className="inline-flex items-center gap-2 text-xs font-semibold text-[#57534E] hover:text-[#B91C1C] transition-colors">
            <ArrowLeft size={15} /> Back to Menu
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl border border-[#E7E0D8] shadow-xs overflow-hidden grid lg:grid-cols-12">
          
          {/* Left Column: Image (6 cols) */}
          <div className="lg:col-span-6 bg-[#F4EFEA] p-6 sm:p-10 flex flex-col justify-between relative min-h-[320px] sm:min-h-[400px]">
            <div className="relative w-full h-full aspect-[4/3] rounded-lg overflow-hidden border border-[#E7E0D8] shadow-xs">
              <img
                src={productImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="absolute top-8 left-8 flex flex-col gap-1.5 z-10">
              <span className={`badge ${product.is_veg ? 'badge-veg' : 'badge-nonveg'}`}>
                {product.is_veg ? 'Veg' : 'Non-Veg'}
              </span>
              {product.is_spicy && <span className="badge badge-spicy">Spicy</span>}
            </div>
          </div>

          {/* Right Column: Details & Options (6 cols) */}
          <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
                  {product.categoryName || 'Menu Item'}
                </span>
                <div className="flex items-center gap-1 text-[#D97706] text-xs">
                  <Star size={14} fill="currentColor" />
                  <span className="font-bold text-[#1C1917]">4.9</span>
                  <span className="text-[#A8A29E] text-[10px]">(150+ ratings)</span>
                </div>
              </div>

              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#1C1917] mb-3 leading-tight">
                {product.name}
              </h1>

              <p className="text-[#57534E] text-xs sm:text-sm leading-relaxed mb-6">
                {product.description}
              </p>

              {/* Ingredients */}
              {product.ingredients && (
                <div className="bg-[#FBF9F5] rounded-md p-3.5 border border-[#E7E0D8] mb-6 text-xs text-[#57534E] space-y-1">
                  <p className="font-semibold text-[#1C1917] flex items-center gap-1.5">
                    <Flame size={14} className="text-[#B91C1C]" /> Ingredients:
                    <span className="font-normal">{product.ingredients}</span>
                  </p>
                </div>
              )}

              {/* Customization Options */}
              {product.options && product.options.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-[#E7E0D8]">
                  {product.options.map((opt: ProductOption) => (
                    <div key={opt.id}>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-2">
                        Select {opt.name}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {opt.choices.map((choice: OptionChoice) => {
                          const isSelected = selectedOptions[opt.name]?.choice === choice.label
                          return (
                            <button
                              key={choice.label}
                              onClick={() => handleOptionSelect(opt.name, choice.label, choice.price_delta)}
                              className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-all border ${
                                isSelected
                                  ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                                  : 'bg-[#FBF9F5] text-[#57534E] border-[#E7E0D8] hover:bg-[#F4EFEA]'
                              }`}
                            >
                              {choice.label}
                              {choice.price_delta > 0 && ` (+${formatPrice(choice.price_delta)})`}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-[#E7E0D8] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-[#F4EFEA] rounded-md px-2 py-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-md bg-white flex items-center justify-center text-[#1C1917] hover:bg-[#E7E0D8] transition-colors font-bold text-xs"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-bold text-sm text-[#1C1917] w-6 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-md bg-white flex items-center justify-center text-[#1C1917] hover:bg-[#E7E0D8] transition-colors font-bold text-xs"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div>
                  <span className="text-[10px] text-[#A8A29E] font-bold uppercase block text-right">Total Price</span>
                  <span className="font-bold text-2xl text-[#B91C1C]">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2"
              >
                <ShoppingCart size={18} /> Add to Cart — {formatPrice(totalPrice)}
              </button>

              <div className="flex items-center justify-around text-xs text-[#57534E] pt-2 border-t border-[#E7E0D8]/60">
                <span className="flex items-center gap-1"><Truck size={14} className="text-[#15803D]" /> 30-Min Express Delivery</span>
                <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-[#1C1917]" /> Fresh Mozzarella Guarantee</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
