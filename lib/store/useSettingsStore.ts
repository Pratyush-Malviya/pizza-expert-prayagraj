import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface FaqItem {
  id: string
  category: string
  question: string
  answer: string
}

export interface CarouselOffer {
  id: string
  badge: string
  badgeColor?: 'orange' | 'yellow' | 'green' | 'purple'
  title: string
  subtitle: string
  code?: string
  discount: string
  expiryText: string
  imageUrl: string
  href: string
  active?: boolean
}

interface SettingsState {
  logoDataUrl: string | null
  setLogoDataUrl: (url: string | null) => void
  
  // Theme & Styling
  themePrimaryColor: string
  themeSecondaryColor: string
  themeBackgroundColor: string
  themeTextColor: string
  themeFontFamily: string

  // Hero Section Customizer
  heroBadge: string
  heroTitleLine1: string
  heroTitleSub: string
  heroTitleLine2: string
  heroDescription: string
  heroPrimaryBtnText: string
  heroPrimaryBtnLink: string
  heroSecondaryBtnText: string
  heroSecondaryBtnLink: string
  heroImageUrl: string

  // Section Headings & Content
  aboutHeading: string
  aboutParagraph: string
  menuTitle: string
  menuSubtitle: string

  // FAQs
  faqs: FaqItem[]
  addFaq: (faq: Omit<FaqItem, 'id'>) => void
  updateFaq: (id: string, faq: Partial<FaqItem>) => void
  deleteFaq: (id: string) => void
  
  // Flash Offers Carousel CRUD
  carouselOffers: CarouselOffer[]
  addCarouselOffer: (offer: Omit<CarouselOffer, 'id'>) => void
  updateCarouselOffer: (id: string, offer: Partial<CarouselOffer>) => void
  deleteCarouselOffer: (id: string) => void
  reorderCarouselOffers: (offers: CarouselOffer[]) => void
  toggleCarouselOfferActive: (id: string) => void

  // Business Details
  businessName: string
  phone: string
  whatsapp: string
  email: string
  address: string
  deliveryFee: number
  freeDeliveryAbove: number
  taxRate: number
  gstinNumber: string
  fssaiNumber: string
  
  // Social Links
  facebookUrl: string
  instagramUrl: string
  twitterUrl: string
  
  // Integrations & Maps
  googleReviewsLink: string
  googleMapsEmbedUrl: string
  
  // Features & Flash Banner
  enableInstagramCarousel: boolean
  enableFlashBanner: boolean
  flashBannerText: string
  flashBannerBadge: string
  flashBannerLink: string
  flashBannerImageUrl: string
  
  // Payment Gateways
  enableRazorpay: boolean
  razorpayKeyId: string
  razorpayKeySecret: string

  // Admin Profile Customization
  adminName: string
  adminEmail: string
  adminAvatarUrl: string | null

  // Setter
  updateSettings: (settings: Partial<SettingsState>) => void
}

const DEFAULT_FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'Ordering & Delivery',
    question: 'How long does delivery take?',
    answer: 'We aim to deliver your order within 30 minutes in Prayagraj. During peak hours (weekends/evenings), it may take up to 45 minutes.',
  },
  {
    id: 'faq-2',
    category: 'Ordering & Delivery',
    question: 'What is the minimum order for free delivery?',
    answer: 'We offer FREE delivery on all orders above ₹499. For orders under ₹499, a nominal delivery fee of ₹30 applies.',
  },
  {
    id: 'faq-3',
    category: 'Ordering & Delivery',
    question: 'What areas do you deliver to in Prayagraj?',
    answer: 'We deliver across Allapur, Civil Lines, Katra, Tagoretown, Ashok Nagar, and surrounding areas in Prayagraj.',
  },
  {
    id: 'faq-4',
    category: 'Payments & Refunds',
    question: 'What payment options are available?',
    answer: 'We accept Razorpay (UPI, Credit/Debit Cards, Net Banking) and Cash on Delivery (COD).',
  },
  {
    id: 'faq-5',
    category: 'Food & Ingredients',
    question: 'Are your vegetarian items prepared separately?',
    answer: 'Yes! We follow strict separation protocols. Pure vegetarian items are prepared using dedicated utensils and separate oven spaces.',
  },
]

const DEFAULT_CAROUSEL_OFFERS: CarouselOffer[] = [
  {
    id: 'offer-1',
    badge: 'FLASH DEAL ⚡',
    badgeColor: 'orange',
    title: '20% OFF YOUR FIRST ORDER',
    subtitle: 'Taste Prayagraj’s finest wood-fired pizza crafted with 48h fermented dough.',
    code: 'WELCOME20',
    discount: 'FLAT 20% OFF',
    expiryText: 'Valid for all new users',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    href: '/menu',
    active: true,
  },
  {
    id: 'offer-2',
    badge: 'WEEKEND SPECIAL 🔥',
    badgeColor: 'yellow',
    title: 'BUY 1 LARGE PIZZA, GET 2ND AT 50% OFF',
    subtitle: 'Double the pizza, double the joy! Choose any 2 Large gourmet wood-fired pizzas.',
    code: 'BOGO50',
    discount: 'SAVE UP TO ₹250',
    expiryText: 'Limited period offer',
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
    href: '/menu?category=pizzas',
    active: true,
  },
  {
    id: 'offer-3',
    badge: 'FREE GIFT 🎁',
    badgeColor: 'green',
    title: 'FREE CHEESY GARLIC BREAD & 2 COKES',
    subtitle: 'Add any 2 Pizzas to cart & enjoy complimentary sides automatically!',
    code: 'FREECOMBO',
    discount: 'WORTH ₹199 FREE',
    expiryText: 'Orders above ₹599',
    imageUrl: 'https://images.unsplash.com/photo-1619895092538-128341789043?auto=format&fit=crop&w=600&q=80',
    href: '/offers',
    active: true,
  },
  {
    id: 'offer-4',
    badge: 'MEGA COMBO 🍕',
    badgeColor: 'purple',
    title: 'ULTIMATE FAMILY FEAST @ JUST ₹899',
    subtitle: '2 Large Pizzas + Stuffed Garlic Bread + 4 Drinks. Save ₹450 today!',
    code: 'FEAST899',
    discount: 'FLAT 35% SAVINGS',
    expiryText: 'Popular in Allapur',
    imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80',
    href: '/menu',
    active: true,
  },
]

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      logoDataUrl: null,
      setLogoDataUrl: (url) => set({ logoDataUrl: url }),

      // Theme Defaults
      themePrimaryColor: '#e10600',
      themeSecondaryColor: '#4f0423',
      themeBackgroundColor: '#260212',
      themeTextColor: '#ffffff',
      themeFontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",

      // Hero Section Defaults
      heroBadge: 'EST. 2018 • ALLAPUR, PRAYAGRAJ',
      heroTitleLine1: 'WOOD-FIRED',
      heroTitleSub: '(FROM ALLAPUR)',
      heroTitleLine2: 'REAL PIZZA.',
      heroDescription: 'Authentic wood-fired pizza crafted daily in Allapur with slow-fermented 48-hour dough, real mozzarella, and aromatic basil leaves.',
      heroPrimaryBtnText: 'ORDER ONLINE',
      heroPrimaryBtnLink: '/menu',
      heroSecondaryBtnText: 'FIND STORE & DEALS',
      heroSecondaryBtnLink: '/offers',
      heroImageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80',

      // Section Content Defaults
      aboutHeading: 'Crafted With Passion & Wood Fire',
      aboutParagraph: 'Pizza Expert Prayagraj brings authentic wood-fired pizzas to Allapur and across Prayagraj. Every pizza features hand-stretched 48-hour fermented dough, signature tomato sauce, and 100% real mozzarella cheese.',
      menuTitle: 'Our Full Menu',
      menuSubtitle: 'Wood-fired pizzas, crispy burgers, pasta, sides & drinks delivered piping hot across Prayagraj.',

      // FAQs Defaults & Handlers
      faqs: DEFAULT_FAQS,
      addFaq: (faq) =>
        set((state) => ({
          faqs: [...state.faqs, { ...faq, id: `faq-${Date.now()}` }],
        })),
      updateFaq: (id, updated) =>
        set((state) => ({
          faqs: state.faqs.map((item) => (item.id === id ? { ...item, ...updated } : item)),
        })),
      deleteFaq: (id) =>
        set((state) => ({
          faqs: state.faqs.filter((item) => item.id !== id),
        })),

      // Carousel Offers Defaults & Handlers
      carouselOffers: DEFAULT_CAROUSEL_OFFERS,
      addCarouselOffer: (offer) =>
        set((state) => ({
          carouselOffers: [
            ...state.carouselOffers,
            { ...offer, id: `offer-${Date.now()}`, active: offer.active ?? true },
          ],
        })),
      updateCarouselOffer: (id, updated) =>
        set((state) => ({
          carouselOffers: state.carouselOffers.map((item) => (item.id === id ? { ...item, ...updated } : item)),
        })),
      deleteCarouselOffer: (id) =>
        set((state) => ({
          carouselOffers: state.carouselOffers.filter((item) => item.id !== id),
        })),
      reorderCarouselOffers: (newOffers) =>
        set({ carouselOffers: newOffers }),
      toggleCarouselOfferActive: (id) =>
        set((state) => ({
          carouselOffers: state.carouselOffers.map((item) =>
            item.id === id ? { ...item, active: !item.active } : item
          ),
        })),

      businessName: 'Pizza Expert Prayagraj',
      phone: '+91-9999999999',
      whatsapp: '919999999999',
      email: 'hello@pizzaexpert.in',
      address: 'Allapur, Prayagraj, Uttar Pradesh 211006',
      deliveryFee: 40,
      freeDeliveryAbove: 499,
      taxRate: 5,
      gstinNumber: '09ABCDE1234F1Z5',
      fssaiNumber: '12723999000123',

      facebookUrl: '',
      instagramUrl: '',
      twitterUrl: '',

      googleReviewsLink: 'https://g.page/r/pizzaexpert-prayagraj/review',
      googleMapsEmbedUrl: 'https://maps.google.com/maps?q=Allapur,+Prayagraj,+Uttar+Pradesh&t=&z=14&ie=UTF8&iwloc=&output=embed',

      enableInstagramCarousel: false,
      enableFlashBanner: true,
      flashBannerText: '🔥 FLAT 20% OFF on all Wood-Fired Pizzas! Use coupon code: PIZZA20',
      flashBannerBadge: 'FLASH OFFER',
      flashBannerLink: '/menu',
      flashBannerImageUrl: '',

      enableRazorpay: false,
      razorpayKeyId: '',
      razorpayKeySecret: '',

      // Admin Profile Defaults
      adminName: 'Pratyush Malviya',
      adminEmail: 'malviya.pratyush26@gmail.com',
      adminAvatarUrl: null,

      updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
    }),
    {
      name: 'pizza-expert-settings', // unique name for localStorage key
    }
  )
)

