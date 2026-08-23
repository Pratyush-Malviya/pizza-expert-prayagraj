'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Save,
  Building,
  CreditCard,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  MapPin,
  Camera,
  LayoutTemplate,
  Flame,
  Mail,
  Receipt,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import { updateHomepageReviewSettings } from '@/app/actions/settings'
import EmailTemplateManager from '@/components/admin/EmailTemplateManager'
import Image from 'next/image'
import MediaLibraryModal from '@/components/admin/MediaLibraryModal'
import { saveUploadedImageToHistory } from '@/lib/utils/mediaLibrary'

function AdminSettingsContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [settingsTab, setSettingsTab] = useState<'general' | 'emails'>(
    tabParam === 'emails' ? 'emails' : 'general'
  )

  const storeSettings = useSettingsStore()
  const { logoDataUrl, setLogoDataUrl, updateSettings } = storeSettings

  // Local state for the form so we don't update the global store on every keystroke
  const [formData, setFormData] = useState({
    businessName: '',
    brandBadge: 'PRO',
    locationTagline: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    deliveryFee: 0,
    freeDeliveryAbove: 0,
    taxRate: 0,
    gstinNumber: '',
    fssaiNumber: '',
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    googleReviewsLink: '',
    googleMapsEmbedUrl: '',
    reviewsRatingScore: '4.9 / 5.0',
    reviewsSectionTitle: 'PRAYAGRAJ REVIEWS',
    reviewsSectionSubtitle: 'Over 500+ verified 5-star ratings on Google from pizza lovers across Allahabad.',
    enableInstagramCarousel: false,
    enableFlashBanner: true,
    flashBannerText: '',
    flashBannerBadge: '',
    flashBannerLink: '',
    flashBannerImageUrl: '',
    enableRazorpay: false,
    razorpayKeyId: '',
    razorpayKeySecret: '',
    adminName: 'Pratyush Malviya',
    adminEmail: 'malviya.pratyush26@gmail.com',
    adminAvatarUrl: '',
  })

  // Hydrate local state from global store on mount
  const [mounted, setMounted] = useState(false)
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [mediaTarget, setMediaTarget] = useState<'avatar' | 'logo' | 'banner'>('logo')

  useEffect(() => {
    queueMicrotask(() => {
      setFormData({
        businessName: storeSettings.businessName || 'Pizza Expert',
        brandBadge: storeSettings.brandBadge !== undefined ? storeSettings.brandBadge : 'PRO',
        locationTagline: storeSettings.locationTagline || 'ALLAPUR • PRAYAGRAJ',
        phone: storeSettings.phone,
        whatsapp: storeSettings.whatsapp,
        email: storeSettings.email,
        address: storeSettings.address,
        deliveryFee: storeSettings.deliveryFee,
        freeDeliveryAbove: storeSettings.freeDeliveryAbove,
        taxRate: storeSettings.taxRate,
        gstinNumber: storeSettings.gstinNumber || '09ABCDE1234F1Z5',
        fssaiNumber: storeSettings.fssaiNumber || '12723999000123',
        facebookUrl: storeSettings.facebookUrl,
        instagramUrl: storeSettings.instagramUrl,
        twitterUrl: storeSettings.twitterUrl,
        googleReviewsLink: storeSettings.googleReviewsLink || 'https://g.page/r/pizzaexpert-prayagraj/review',
        googleMapsEmbedUrl: storeSettings.googleMapsEmbedUrl,
        reviewsRatingScore: storeSettings.reviewsRatingScore || '4.9 / 5.0',
        reviewsSectionTitle: storeSettings.reviewsSectionTitle || 'PRAYAGRAJ REVIEWS',
        reviewsSectionSubtitle: storeSettings.reviewsSectionSubtitle || 'Over 500+ verified 5-star ratings on Google from pizza lovers across Allahabad.',
        enableInstagramCarousel: storeSettings.enableInstagramCarousel,
        enableFlashBanner: storeSettings.enableFlashBanner ?? true,
        flashBannerText: storeSettings.flashBannerText || '🔥 FLAT 20% OFF on all Wood-Fired Pizzas! Use coupon code: PIZZA20',
        flashBannerBadge: storeSettings.flashBannerBadge || 'FLASH OFFER',
        flashBannerLink: storeSettings.flashBannerLink || '/menu',
        flashBannerImageUrl: storeSettings.flashBannerImageUrl || '',
        enableRazorpay: storeSettings.enableRazorpay,
        razorpayKeyId: storeSettings.razorpayKeyId,
        razorpayKeySecret: storeSettings.razorpayKeySecret,
        adminName: storeSettings.adminName || 'Pratyush Malviya',
        adminEmail: storeSettings.adminEmail || 'malviya.pratyush26@gmail.com',
        adminAvatarUrl: storeSettings.adminAvatarUrl || '',
      })
      setMounted(true)
    })
  }, [storeSettings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    updateSettings(formData)
    await updateHomepageReviewSettings({
      ratingScore: formData.reviewsRatingScore,
      sectionTitle: formData.reviewsSectionTitle,
      sectionSubtitle: formData.reviewsSectionSubtitle,
      googleReviewsLink: formData.googleReviewsLink,
    })
    toast.success('Settings saved successfully!')
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo file must be less than 2MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setLogoDataUrl(result)
      saveUploadedImageToHistory(result, 'Store Logo')
      toast.success('Logo updated successfully!')
    }
    reader.readAsDataURL(file)
  }

  const handleOfferImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Offer image must be less than 2MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setFormData({ ...formData, flashBannerImageUrl: result })
      saveUploadedImageToHistory(result, 'Flash Banner Image')
      toast.success('Offer image added')
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar image must be less than 2MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setFormData({ ...formData, adminAvatarUrl: result })
      saveUploadedImageToHistory(result, 'Admin Avatar')
      toast.success('Admin avatar photo uploaded!')
    }
    reader.readAsDataURL(file)
  }

  if (!mounted) return null

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#1C1917]">
          Store & System Settings
        </h1>
        <p className="text-[#57534E] text-xs sm:text-sm">
          Configure business details, email templates, integrations, taxes, and payment gateways.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E7E0D8] pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSettingsTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            settingsTab === 'general'
              ? 'bg-[#B91C1C] text-white shadow-xs'
              : 'text-[#57534E] hover:bg-[#F3EFEA] hover:text-[#1C1917]'
          }`}
        >
          <Building size={15} />
          <span>General & Store Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setSettingsTab('emails')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            settingsTab === 'emails'
              ? 'bg-[#B91C1C] text-white shadow-xs'
              : 'text-[#57534E] hover:bg-[#F3EFEA] hover:text-[#1C1917]'
          }`}
        >
          <Mail size={15} />
          <span>Email Template Management</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              settingsTab === 'emails' ? 'bg-white/20 text-white' : 'bg-[#E7E0D8] text-[#1C1917]'
            }`}
          >
            7
          </span>
        </button>

        <Link
          href="/admin/settings/taxes"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-[#57534E] hover:bg-[#F3EFEA] hover:text-[#1C1917] transition-all ml-auto"
        >
          <Receipt size={14} />
          <span>Taxes & Compliance →</span>
        </Link>
      </div>

      {/* TAB CONTENT */}
      {settingsTab === 'emails' ? (
        <EmailTemplateManager />
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Admin Profile & Account */}
          <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
            <h2 className="font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3 flex items-center gap-2">
              <Camera size={18} className="text-[#B91C1C]" /> Admin Profile & App Avatar
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#E7E0D8] bg-[#FBF9F5] flex items-center justify-center overflow-hidden relative group shrink-0">
                {formData.adminAvatarUrl ? (
                  <img src={formData.adminAvatarUrl} alt="Admin Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-[#B91C1C] font-serif font-bold text-xl uppercase">
                    {(formData.adminName || 'PM').slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="space-y-2 flex-1 w-full">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1917] mb-1">Admin Manager Name</label>
                    <input
                      type="text"
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      className="input-field"
                      placeholder="Pratyush Malviya"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1917] mb-1">Alerts & System Email</label>
                    <input
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      className="input-field"
                      placeholder="malviya.pratyush26@gmail.com"
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => { setMediaTarget('avatar'); setMediaModalOpen(true) }}
                    className="btn btn-outline text-xs inline-flex items-center gap-1.5 bg-white text-[#B91C1C] border-[#B91C1C]/40 hover:bg-[#B91C1C]/5 font-semibold"
                  >
                    <ImageIcon size={14} /> Choose from Library
                  </button>
                  <label className="btn btn-secondary text-xs inline-flex items-center gap-2 cursor-pointer">
                    <Upload size={14} /> Upload Avatar Photo
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                  <span className="text-[11px] text-[#78716C] ml-1">Recommended: 400x400 JPG/PNG &lt; 2MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Business Info & Header Brand Names */}
          <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E0D8] pb-3">
              <div>
                <h2 className="font-serif font-bold text-[#1C1917] text-lg flex items-center gap-2">
                  <Building size={18} className="text-[#B91C1C]" /> Business Details & Brand Names
                </h2>
                <p className="text-xs text-[#78716C] mt-0.5">
                  Control both the main brand name, badge tag, and the location/branch subtitle displayed in the header & footer.
                </p>
              </div>
            </div>

            {/* Live Header Logo & Tagline Preview Box */}
            <div className="p-4 rounded-xl bg-[#0D0D11] border border-white/10 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#FF3B00] mb-1 font-bold">
                  Live Header Logo Preview
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-heading font-extrabold text-2xl tracking-tight text-[#FF3B00]">
                      {formData.businessName ? formData.businessName.toUpperCase() : 'PIZZA EXPERT'}
                    </span>
                    {formData.brandBadge && (
                      <span className="bg-[#FF3B00]/15 text-[#FF3B00] border border-[#FF3B00]/30 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md">
                        {formData.brandBadge.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {formData.locationTagline && (
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                      <span className="uppercase tracking-wider">{formData.locationTagline}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right text-[11px] text-zinc-500 hidden sm:block max-w-[200px]">
                Appears at the top-left of the navbar on all customer pages.
              </div>
            </div>

            {/* Brand Names Grid */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  1. Brand / Store Name <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="input-field"
                  placeholder="Pizza Expert"
                  required
                />
                <span className="text-[11px] text-[#78716C] mt-1 block">e.g. PIZZA EXPERT</span>
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  2. Brand Badge (Optional)
                </label>
                <input
                  type="text"
                  value={formData.brandBadge}
                  onChange={(e) => setFormData({ ...formData, brandBadge: e.target.value })}
                  className="input-field"
                  placeholder="PRO"
                />
                <span className="text-[11px] text-[#78716C] mt-1 block">Badge next to logo (e.g. PRO, PLUS)</span>
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  3. Location / Branch Subtitle <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.locationTagline}
                  onChange={(e) => setFormData({ ...formData, locationTagline: e.target.value })}
                  className="input-field"
                  placeholder="ALLAPUR • PRAYAGRAJ"
                  required
                />
                <span className="text-[11px] text-[#78716C] mt-1 block">Sub-header text (e.g. ALLAPUR • PRAYAGRAJ)</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-[#E7E0D8]">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  placeholder="+91-9999999999"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">WhatsApp Order Number</label>
                <input
                  type="text"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="input-field"
                  placeholder="919999999999"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Public Support Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  placeholder="hello@pizzaexpert.in"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Physical Kitchen Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="input-field"
                placeholder="Allapur, Prayagraj, Uttar Pradesh 211006"
                required
              />
            </div>
          </div>

          {/* Branding & Logo */}
          <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
            <h2 className="font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3 flex items-center gap-2">
              <ImageIcon size={18} className="text-[#B91C1C]" /> Branding & Store Logo
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-32 h-16 border-2 border-dashed border-[#E7E0D8] bg-[#FBF9F5] rounded-xl flex items-center justify-center relative overflow-hidden p-2">
                {logoDataUrl ? (
                  <Image src={logoDataUrl} alt="Store Logo" fill className="object-contain p-2" />
                ) : (
                  <span className="text-xs text-[#78716C] font-semibold text-center">No Logo Uploaded</span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setMediaTarget('logo'); setMediaModalOpen(true) }}
                    className="btn btn-outline text-xs inline-flex items-center gap-1.5 bg-white text-[#B91C1C] border-[#B91C1C]/40 hover:bg-[#B91C1C]/5 font-semibold"
                  >
                    <ImageIcon size={14} /> Choose from Library
                  </button>
                  <label className="btn btn-secondary text-xs inline-flex items-center gap-2 cursor-pointer">
                    <Upload size={14} /> Upload Custom Logo
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
                <p className="text-[11px] text-[#78716C]">
                  Recommended: High-resolution transparent PNG (max 2MB). Replaces the default text in header & invoices.
                </p>
              </div>
            </div>
          </div>

          {/* Flash Offers Banner */}
          <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <h2 className="font-serif font-bold text-[#1C1917] text-lg flex items-center gap-2">
                <Flame size={18} className="text-[#FF3B00]" /> Top Flash Offer Banner
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableFlashBanner}
                  onChange={(e) => setFormData({ ...formData, enableFlashBanner: e.target.checked })}
                  className="rounded text-[#B91C1C] focus:ring-[#B91C1C] h-4 w-4"
                />
                <span className="text-xs font-semibold text-[#1C1917]">Enable Banner</span>
              </label>
            </div>
            {formData.enableFlashBanner && (
              <div className="space-y-4 pt-2">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1917] mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={formData.flashBannerBadge}
                      onChange={(e) => setFormData({ ...formData, flashBannerBadge: e.target.value })}
                      className="input-field"
                      placeholder="FLASH OFFER"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#1C1917] mb-1">Banner Announcement Text</label>
                    <input
                      type="text"
                      value={formData.flashBannerText}
                      onChange={(e) => setFormData({ ...formData, flashBannerText: e.target.value })}
                      className="input-field"
                      placeholder="🔥 FLAT 20% OFF on all Wood-Fired Pizzas! Use code: PIZZA20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">Action Link (e.g. /menu)</label>
                  <input
                    type="text"
                    value={formData.flashBannerLink}
                    onChange={(e) => setFormData({ ...formData, flashBannerLink: e.target.value })}
                    className="input-field"
                    placeholder="/menu"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Social Links & Review Integrations */}
          <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
            <h2 className="font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3 flex items-center gap-2">
              <LinkIcon size={18} className="text-[#B91C1C]" /> Social Media & Google Integrations
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Facebook URL</label>
                <input
                  type="url"
                  value={formData.facebookUrl}
                  onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                  className="input-field"
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Instagram URL</label>
                <input
                  type="url"
                  value={formData.instagramUrl}
                  onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                  className="input-field"
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Google Reviews URL</label>
                <input
                  type="url"
                  value={formData.googleReviewsLink}
                  onChange={(e) => setFormData({ ...formData, googleReviewsLink: e.target.value })}
                  className="input-field"
                  placeholder="https://g.page/r/..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Google Maps Embed URL</label>
                <input
                  type="text"
                  value={formData.googleMapsEmbedUrl}
                  onChange={(e) => setFormData({ ...formData, googleMapsEmbedUrl: e.target.value })}
                  className="input-field"
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Homepage Rating Badge Score</label>
                <input
                  type="text"
                  value={formData.reviewsRatingScore}
                  onChange={(e) => setFormData({ ...formData, reviewsRatingScore: e.target.value })}
                  className="input-field font-mono"
                  placeholder="4.9 / 5.0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Homepage Reviews Section Heading</label>
                <input
                  type="text"
                  value={formData.reviewsSectionTitle}
                  onChange={(e) => setFormData({ ...formData, reviewsSectionTitle: e.target.value })}
                  className="input-field"
                  placeholder="PRAYAGRAJ REVIEWS"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Homepage Reviews Section Subtitle</label>
                <textarea
                  rows={2}
                  value={formData.reviewsSectionSubtitle}
                  onChange={(e) => setFormData({ ...formData, reviewsSectionSubtitle: e.target.value })}
                  className="input-field"
                  placeholder="Over 500+ verified 5-star ratings on Google from pizza lovers across Allahabad."
                />
              </div>
            </div>
          </div>

          {/* Payment Gateway (Razorpay) */}
          <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <h2 className="font-serif font-bold text-[#1C1917] text-lg flex items-center gap-2">
                <CreditCard size={18} className="text-[#B91C1C]" /> Razorpay Payment Gateway
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableRazorpay}
                  onChange={(e) => setFormData({ ...formData, enableRazorpay: e.target.checked })}
                  className="rounded text-[#B91C1C] focus:ring-[#B91C1C] h-4 w-4"
                />
                <span className="text-xs font-semibold text-[#1C1917]">Enable Razorpay</span>
              </label>
            </div>
            {formData.enableRazorpay && (
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">Key ID</label>
                  <input
                    type="text"
                    value={formData.razorpayKeyId}
                    onChange={(e) => setFormData({ ...formData, razorpayKeyId: e.target.value })}
                    className="input-field font-mono text-xs"
                    placeholder="rzp_test_..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">Key Secret</label>
                  <input
                    type="password"
                    value={formData.razorpayKeySecret}
                    onChange={(e) => setFormData({ ...formData, razorpayKeySecret: e.target.value })}
                    className="input-field font-mono text-xs"
                    placeholder="••••••••••••••••"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Financial & Delivery Thresholds */}
          <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
            <h2 className="font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3 flex items-center gap-2">
              <MapPin size={18} className="text-[#B91C1C]" /> Delivery Fees, Tax & Licenses
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Standard Delivery Fee (₹)</label>
                <input
                  type="number"
                  value={formData.deliveryFee}
                  onChange={(e) => setFormData({ ...formData, deliveryFee: Number(e.target.value) })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Free Delivery Order Threshold (₹)</label>
                <input
                  type="number"
                  value={formData.freeDeliveryAbove}
                  onChange={(e) => setFormData({ ...formData, freeDeliveryAbove: Number(e.target.value) })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">GST Tax Rate (%)</label>
                <input
                  type="number"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Store GSTIN Registration No.</label>
                <input
                  type="text"
                  value={formData.gstinNumber}
                  onChange={(e) => setFormData({ ...formData, gstinNumber: e.target.value })}
                  className="input-field"
                  placeholder="09ABCDE1234F1Z5"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">FSSAI License No.</label>
                <input
                  type="text"
                  value={formData.fssaiNumber}
                  onChange={(e) => setFormData({ ...formData, fssaiNumber: e.target.value })}
                  className="input-field"
                  placeholder="12723999000123"
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg flex items-center gap-2 shadow-md">
            <Save size={17} /> Save All Settings
          </button>
        </form>
      )}

      {/* Media Library Modal */}
      <MediaLibraryModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        currentImage={mediaTarget === 'logo' ? logoDataUrl : formData.adminAvatarUrl}
        title={mediaTarget === 'logo' ? 'Select Store Logo' : 'Select Admin Avatar Photo'}
        onSelect={(url) => {
          if (mediaTarget === 'logo') {
            setLogoDataUrl(url)
            toast.success('Logo selected from library!')
          } else {
            setFormData({ ...formData, adminAvatarUrl: url })
            toast.success('Avatar selected from library!')
          }
        }}
      />
    </div>
  )
}

export default function AdminSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-[#78716C]">
          Loading Store & Email Settings...
        </div>
      }
    >
      <AdminSettingsContent />
    </Suspense>
  )
}
