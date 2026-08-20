import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EmailTemplate } from '@/types/emailTemplate'
import { DEFAULT_EMAIL_TEMPLATES } from '@/lib/constants/defaultEmailTemplates'

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

  // Email Templates Management
  emailTemplates: EmailTemplate[]
  updateEmailTemplate: (id: string, updates: Partial<EmailTemplate>) => void
  resetEmailTemplates: () => void

  // Store General Info & Header Names
  businessName: string
  brandBadge: string
  locationTagline: string
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
    code: 'PIZZA20',
    discount: '20% OFF',
    expiryText: 'Valid Today',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    href: '/menu',
    active: true,
  },
  {
    id: 'offer-2',
    badge: 'FAMILY COMBO 👨‍👩‍👧‍👦',
    badgeColor: 'green',
    title: 'BUY 2 LARGE GET 1 GARLIC BREAD FREE',
    subtitle: 'Perfect for weekend pizza parties & family get-togethers in Prayagraj.',
    code: 'COMBOFEAST',
    discount: 'FREE SIDE',
    expiryText: 'Weekend Special',
    imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
    href: '/menu',
    active: true,
  },
  {
    id: 'offer-3',
    badge: 'FREE DELIVERY 🛵',
    badgeColor: 'yellow',
    title: 'ZERO DELIVERY FEE ON ORDERS ABOVE ₹499',
    subtitle: 'Piping hot wood-fired pizzas delivered to your doorstep in 30 minutes.',
    code: 'FREEDEL',
    discount: '100% OFF',
    expiryText: 'All Days',
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    href: '/menu',
    active: true,
  },
]

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      logoDataUrl: null,
      setLogoDataUrl: (url) => set({ logoDataUrl: url }),

      // Theme & Colors
      themePrimaryColor: '#FF3B00',
      themeSecondaryColor: '#FFC01D',
      themeBackgroundColor: '#08080B',
      themeTextColor: '#FFFFFF',
      themeFontFamily: 'Plus Jakarta Sans',

      // Hero Section
      heroBadge: 'ALLAPUR, PRAYAGRAJ • 100% AUTHENTIC WOOD-FIRED',
      heroTitleLine1: 'HOTTEST',
      heroTitleSub: 'WOOD-FIRED',
      heroTitleLine2: 'PIZZAS IN PRAYAGRAJ',
      heroDescription: 'Crafted with 48-hour slow-fermented Neapolitan dough, San Marzano tomato coulis, creamy Fior di Latte mozzarella, and baked at blistering 450°C in our wood-fired brick oven.',
      heroPrimaryBtnText: 'ORDER ONLINE NOW',
      heroPrimaryBtnLink: '/menu',
      heroSecondaryBtnText: 'VIEW LIVE MENU',
      heroSecondaryBtnLink: '/menu',
      heroImageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80',

      // Section Headings & Content
      aboutHeading: 'The Art of Wood-Fired Pizza in the Heart of Prayagraj',
      aboutParagraph: 'Founded in Allapur, Pizza Expert brings world-class Neapolitan pizza craftsmanship to the holy city of Prayagraj. Every dough is hand-stretched, topped with premium imported and fresh local farm ingredients, and baked to blistered leopard-spotted perfection in under 90 seconds.',
      menuTitle: 'DISCOVER OUR ARTISANAL PIZZAS',
      menuSubtitle: 'Wood-fired sourdough pizzas, cheesy garlic breads, and chilled beverages crafted with passion in Prayagraj.',

      // FAQs
      faqs: DEFAULT_FAQS,
      addFaq: (faq) => set((state) => ({ faqs: [...state.faqs, { ...faq, id: `faq-${Date.now()}` }] })),
      updateFaq: (id, updatedFaq) => set((state) => ({
        faqs: state.faqs.map((f) => (f.id === id ? { ...f, ...updatedFaq } : f)),
      })),
      deleteFaq: (id) => set((state) => ({
        faqs: state.faqs.filter((f) => f.id !== id),
      })),

      // Carousel Offers
      carouselOffers: DEFAULT_CAROUSEL_OFFERS,
      addCarouselOffer: (offer) => set((state) => ({
        carouselOffers: [...state.carouselOffers, { ...offer, id: `offer-${Date.now()}` }],
      })),
      updateCarouselOffer: (id, updatedOffer) => set((state) => ({
        carouselOffers: state.carouselOffers.map((o) => (o.id === id ? { ...o, ...updatedOffer } : o)),
      })),
      deleteCarouselOffer: (id) => set((state) => ({
        carouselOffers: state.carouselOffers.filter((o) => o.id !== id),
      })),
      reorderCarouselOffers: (offers) => set({ carouselOffers: offers }),
      toggleCarouselOfferActive: (id) => set((state) => ({
        carouselOffers: state.carouselOffers.map((o) =>
          o.id === id ? { ...o, active: !(o.active ?? true) } : o
        ),
      })),

      // Email Templates Management
      emailTemplates: DEFAULT_EMAIL_TEMPLATES,
      updateEmailTemplate: (id, updates) => set((state) => ({
        emailTemplates: (state.emailTemplates || DEFAULT_EMAIL_TEMPLATES).map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      })),
      resetEmailTemplates: () => set({ emailTemplates: DEFAULT_EMAIL_TEMPLATES }),

      businessName: 'Pizza Expert',
      brandBadge: 'PRO',
      locationTagline: 'ALLAPUR • PRAYAGRAJ',
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

      enableRazorpay: true,
      razorpayKeyId: 'rzp_test_TOUKlh4UdsSiXL',
      razorpayKeySecret: '7jQXoto16ovDYBjCXXv6rFTM',

      // Admin Profile Defaults
      adminName: 'Pratyush Malviya',
      adminEmail: 'malviya.pratyush26@gmail.com',
      adminAvatarUrl: null,

      updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
    }),
    {
      name: 'pizza-expert-settings',
    }
  )
)
