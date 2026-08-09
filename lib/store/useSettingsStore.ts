import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  logoDataUrl: string | null
  setLogoDataUrl: (url: string | null) => void
  
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
  
  // Features
  enableInstagramCarousel: boolean
  
  // Payment Gateways
  enableRazorpay: boolean
  razorpayKeyId: string
  razorpayKeySecret: string

  // Setter
  updateSettings: (settings: Partial<SettingsState>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      logoDataUrl: null,
      setLogoDataUrl: (url) => set({ logoDataUrl: url }),

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

      enableRazorpay: false,
      razorpayKeyId: '',
      razorpayKeySecret: '',

      updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
    }),
    {
      name: 'pizza-expert-settings', // unique name for localStorage key
    }
  )
)
