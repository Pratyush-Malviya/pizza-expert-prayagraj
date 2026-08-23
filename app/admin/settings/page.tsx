'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
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
  Flame,
  Mail,
  Receipt,
  Clock,
  Truck,
  ShieldCheck,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Download,
  UploadCloud,
  Percent,
  Phone,
  MessageCircle,
  QrCode,
  Utensils,
  Store,
  ChevronRight,
  Info,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import { updateHomepageReviewSettings } from '@/app/actions/settings'
import EmailTemplateManager from '@/components/admin/EmailTemplateManager'
import Image from 'next/image'
import MediaLibraryModal from '@/components/admin/MediaLibraryModal'
import { saveUploadedImageToHistory } from '@/lib/utils/mediaLibrary'

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
]

function AdminSettingsContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [settingsTab, setSettingsTab] = useState<'business' | 'emails'>(
    tabParam === 'emails' ? 'emails' : 'business'
  )

  const [activeSection, setActiveSection] = useState<
    | 'identity'
    | 'contact'
    | 'schedule'
    | 'delivery'
    | 'compliance'
    | 'payments'
    | 'socials'
    | 'promos'
  >('identity')

  const storeSettings = useSettingsStore()
  const { logoDataUrl, setLogoDataUrl, updateSettings } = storeSettings

  const [isSaving, setIsSaving] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    // 1. Identity & Branding
    businessName: 'Pizza Expert',
    brandBadge: 'PRO',
    locationTagline: 'ALLAPUR • PRAYAGRAJ',
    businessBio: '',
    storeStatus: 'open' as 'open' | 'closed' | 'busy',
    adminName: 'Pratyush Malviya',
    adminEmail: 'malviya.pratyush26@gmail.com',
    adminAvatarUrl: '',

    // 2. Contact & Physical Location
    phone: '+91-9999999999',
    whatsapp: '919999999999',
    email: 'hello@pizzaexpert.in',
    address: 'Shop No. 4, Ground Floor, Allapur Main Road, Prayagraj, Uttar Pradesh 211006',
    landmark: '',
    googleMapsDirectionsUrl: '',
    googleMapsEmbedUrl: '',

    // 3. Operating Schedule
    operatingHoursText: '11:00 AM – 11:30 PM (All Days)',
    weeklySchedule: {
      monday: { open: '11:00', close: '23:30', closed: false },
      tuesday: { open: '11:00', close: '23:30', closed: false },
      wednesday: { open: '11:00', close: '23:30', closed: false },
      thursday: { open: '11:00', close: '23:30', closed: false },
      friday: { open: '11:00', close: '23:59', closed: false },
      saturday: { open: '11:00', close: '23:59', closed: false },
      sunday: { open: '11:00', close: '23:59', closed: false },
    } as Record<string, { open: string; close: string; closed: boolean }>,
    prepTimeMinutes: 15,
    deliveryTimeText: '30-45 mins',

    // 4. Delivery & Service Rules
    deliveryRadiusKm: 8,
    deliveryFee: 40,
    freeDeliveryAbove: 499,
    minOrderValue: 149,
    packagingCharge: 15,
    enableDelivery: true,
    enableTakeaway: true,
    enableDineIn: true,
    enableCod: true,

    // 5. Compliance & Invoicing
    taxRate: 5,
    gstinNumber: '',
    fssaiNumber: '',
    panNumber: '',
    invoiceFooterNote: '',

    // 6. Payments & Banking
    enableRazorpay: true,
    razorpayKeyId: '',
    razorpayKeySecret: '',
    upiId: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfsc: '',

    // 7. Socials & Aggregators
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    zomatoUrl: '',
    swiggyUrl: '',
    googleReviewsLink: '',
    reviewsRatingScore: '4.9 / 5.0',
    reviewsSectionTitle: 'PRAYAGRAJ REVIEWS',
    reviewsSectionSubtitle: '',
    enableInstagramCarousel: false,

    // 8. Flash Announcement Banner
    enableFlashBanner: true,
    flashBannerText: '',
    flashBannerBadge: '',
    flashBannerLink: '',
    flashBannerImageUrl: '',
  })

  const [mounted, setMounted] = useState(false)
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [mediaTarget, setMediaTarget] = useState<'avatar' | 'logo' | 'banner'>('logo')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hydrate from global Zustand store on mount and store updates
  // Uses nullish coalescing (??) so that empty strings saved by the user are preserved!
  useEffect(() => {
    queueMicrotask(() => {
      setFormData({
        businessName: storeSettings.businessName ?? 'Pizza Expert',
        brandBadge: storeSettings.brandBadge ?? 'PRO',
        locationTagline: storeSettings.locationTagline ?? 'ALLAPUR • PRAYAGRAJ',
        businessBio: storeSettings.businessBio ?? '',
        storeStatus: (storeSettings.storeStatus as any) ?? 'open',
        adminName: storeSettings.adminName ?? 'Pratyush Malviya',
        adminEmail: storeSettings.adminEmail ?? 'malviya.pratyush26@gmail.com',
        adminAvatarUrl: storeSettings.adminAvatarUrl ?? '',

        phone: storeSettings.phone ?? '+91-9999999999',
        whatsapp: storeSettings.whatsapp ?? '919999999999',
        email: storeSettings.email ?? 'hello@pizzaexpert.in',
        address:
          storeSettings.address ??
          'Shop No. 4, Ground Floor, Allapur Main Road, Prayagraj, Uttar Pradesh 211006',
        landmark: storeSettings.landmark ?? '',
        googleMapsDirectionsUrl: storeSettings.googleMapsDirectionsUrl ?? '',
        googleMapsEmbedUrl: storeSettings.googleMapsEmbedUrl ?? '',

        operatingHoursText: storeSettings.operatingHoursText ?? '11:00 AM – 11:30 PM (All Days)',
        weeklySchedule: (storeSettings.weeklySchedule as any) ?? {
          monday: { open: '11:00', close: '23:30', closed: false },
          tuesday: { open: '11:00', close: '23:30', closed: false },
          wednesday: { open: '11:00', close: '23:30', closed: false },
          thursday: { open: '11:00', close: '23:30', closed: false },
          friday: { open: '11:00', close: '23:59', closed: false },
          saturday: { open: '11:00', close: '23:59', closed: false },
          sunday: { open: '11:00', close: '23:59', closed: false },
        },
        prepTimeMinutes: storeSettings.prepTimeMinutes ?? 15,
        deliveryTimeText: storeSettings.deliveryTimeText ?? '30-45 mins',

        deliveryRadiusKm: storeSettings.deliveryRadiusKm ?? 8,
        deliveryFee: storeSettings.deliveryFee ?? 40,
        freeDeliveryAbove: storeSettings.freeDeliveryAbove ?? 499,
        minOrderValue: storeSettings.minOrderValue ?? 149,
        packagingCharge: storeSettings.packagingCharge ?? 15,
        enableDelivery: storeSettings.enableDelivery ?? true,
        enableTakeaway: storeSettings.enableTakeaway ?? true,
        enableDineIn: storeSettings.enableDineIn ?? true,
        enableCod: storeSettings.enableCod ?? true,

        taxRate: storeSettings.taxRate ?? 5,
        gstinNumber: storeSettings.gstinNumber ?? '',
        fssaiNumber: storeSettings.fssaiNumber ?? '',
        panNumber: storeSettings.panNumber ?? '',
        invoiceFooterNote: storeSettings.invoiceFooterNote ?? '',

        enableRazorpay: storeSettings.enableRazorpay ?? true,
        razorpayKeyId: storeSettings.razorpayKeyId ?? '',
        razorpayKeySecret: storeSettings.razorpayKeySecret ?? '',
        upiId: storeSettings.upiId ?? '',
        bankName: storeSettings.bankName ?? '',
        bankAccountNumber: storeSettings.bankAccountNumber ?? '',
        bankIfsc: storeSettings.bankIfsc ?? '',

        facebookUrl: storeSettings.facebookUrl ?? '',
        instagramUrl: storeSettings.instagramUrl ?? '',
        twitterUrl: storeSettings.twitterUrl ?? '',
        zomatoUrl: storeSettings.zomatoUrl ?? '',
        swiggyUrl: storeSettings.swiggyUrl ?? '',
        googleReviewsLink: storeSettings.googleReviewsLink ?? '',
        reviewsRatingScore: storeSettings.reviewsRatingScore ?? '4.9 / 5.0',
        reviewsSectionTitle: storeSettings.reviewsSectionTitle ?? 'PRAYAGRAJ REVIEWS',
        reviewsSectionSubtitle: storeSettings.reviewsSectionSubtitle ?? '',
        enableInstagramCarousel: storeSettings.enableInstagramCarousel ?? false,

        enableFlashBanner: storeSettings.enableFlashBanner ?? true,
        flashBannerText: storeSettings.flashBannerText ?? '',
        flashBannerBadge: storeSettings.flashBannerBadge ?? '',
        flashBannerLink: storeSettings.flashBannerLink ?? '',
        flashBannerImageUrl: storeSettings.flashBannerImageUrl ?? '',
      })
      setMounted(true)
    })
  }, [storeSettings])

  const copyToClipboard = (text: string, keyName: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedKey(keyName)
    toast.success(`Copied "${text}" to clipboard!`)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      updateSettings(formData)
      await updateHomepageReviewSettings({
        ratingScore: formData.reviewsRatingScore,
        sectionTitle: formData.reviewsSectionTitle,
        sectionSubtitle: formData.reviewsSectionSubtitle,
        googleReviewsLink: formData.googleReviewsLink,
      })
      // Small visual pause for smooth feedback
      await new Promise((r) => setTimeout(r, 600))
      toast.success('All client business details saved successfully!')
    } catch (err: any) {
      console.error('Save settings error:', err)
      toast.error(err?.message || 'Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
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

  const handleExportBackup = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(formData, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute(
      'download',
      `${(formData.businessName || 'pizza-expert').toLowerCase().replace(/\s+/g, '-')}-settings-backup.json`
    )
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    toast.success('Settings JSON backup downloaded!')
  }

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        setFormData((prev) => ({ ...prev, ...parsed }))
        toast.success('Settings loaded from file! Click "Save All Business Settings" to apply.')
      } catch (err) {
        toast.error('Invalid JSON settings backup file')
      }
    }
    reader.readAsText(file)
  }

  if (!mounted) return null

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* ── TOP HEADER & LIVE BUSINESS OVERVIEW BANNER ── */}
      <div className="bg-gradient-to-r from-[#1C1917] via-[#292524] to-[#1C1917] text-white rounded-2xl p-6 sm:p-7 border border-white/10 shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
          <Store size={220} />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-mono uppercase tracking-widest bg-[#FF3B00]/20 text-[#FF3B00] border border-[#FF3B00]/40 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5">
                <Store size={12} /> Master Client Hub
              </span>

              {/* Live Status Switch */}
              <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-2.5 py-0.5 rounded-full">
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    formData.storeStatus === 'open'
                      ? 'bg-emerald-400'
                      : formData.storeStatus === 'busy'
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                />
                <select
                  value={formData.storeStatus}
                  onChange={(e) =>
                    setFormData({ ...formData, storeStatus: e.target.value as any })
                  }
                  className="bg-transparent text-xs font-bold text-white border-none focus:outline-none cursor-pointer"
                >
                  <option value="open" className="text-[#1C1917]">
                    🟢 Store Open for Orders
                  </option>
                  <option value="busy" className="text-[#1C1917]">
                    🟡 Rush Mode / Kitchen Busy
                  </option>
                  <option value="closed" className="text-[#1C1917]">
                    🔴 Store Closed
                  </option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-white flex items-center gap-2">
                {formData.businessName}
                {formData.brandBadge && (
                  <span className="bg-[#FF3B00] text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider">
                    {formData.brandBadge}
                  </span>
                )}
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              {formData.locationTagline} • {formData.address}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/"
              target="_blank"
              className="btn btn-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold inline-flex items-center gap-1.5 backdrop-blur-xs transition"
            >
              <ExternalLink size={14} /> View Live Storefront
            </Link>

            <button
              type="button"
              onClick={handleExportBackup}
              className="btn btn-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold inline-flex items-center gap-1.5 backdrop-blur-xs transition"
              title="Download full settings backup as JSON"
            >
              <Download size={14} /> Export JSON
            </button>

            <label className="btn btn-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold inline-flex items-center gap-1.5 backdrop-blur-xs transition cursor-pointer">
              <UploadCloud size={14} /> Import Backup
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Quick Copy Chips (GST, FSSAI, Phone, WhatsApp, UPI) */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-stone-400 font-semibold text-[11px] uppercase tracking-wider mr-1">
            Quick Copy:
          </span>

          <button
            type="button"
            onClick={() => copyToClipboard(formData.gstinNumber, 'gstin')}
            className="bg-white/10 hover:bg-white/20 text-stone-200 border border-white/15 px-2.5 py-1 rounded-lg font-mono text-[11px] flex items-center gap-1.5 transition"
          >
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>GSTIN: {formData.gstinNumber || 'Not set'}</span>
            {copiedKey === 'gstin' ? <Check size={12} className="text-emerald-400" /> : <Copy size={11} />}
          </button>

          <button
            type="button"
            onClick={() => copyToClipboard(formData.fssaiNumber, 'fssai')}
            className="bg-white/10 hover:bg-white/20 text-stone-200 border border-white/15 px-2.5 py-1 rounded-lg font-mono text-[11px] flex items-center gap-1.5 transition"
          >
            <Utensils size={13} className="text-amber-400" />
            <span>FSSAI: {formData.fssaiNumber || 'Not set'}</span>
            {copiedKey === 'fssai' ? <Check size={12} className="text-emerald-400" /> : <Copy size={11} />}
          </button>

          <button
            type="button"
            onClick={() => copyToClipboard(formData.phone, 'phone')}
            className="bg-white/10 hover:bg-white/20 text-stone-200 border border-white/15 px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5 transition"
          >
            <Phone size={13} className="text-sky-400" />
            <span>{formData.phone}</span>
            {copiedKey === 'phone' ? <Check size={12} className="text-emerald-400" /> : <Copy size={11} />}
          </button>

          <button
            type="button"
            onClick={() => copyToClipboard(formData.upiId, 'upi')}
            className="bg-white/10 hover:bg-white/20 text-stone-200 border border-white/15 px-2.5 py-1 rounded-lg font-mono text-[11px] flex items-center gap-1.5 transition"
          >
            <QrCode size={13} className="text-purple-400" />
            <span>UPI: {formData.upiId || 'Not set'}</span>
            {copiedKey === 'upi' ? <Check size={12} className="text-emerald-400" /> : <Copy size={11} />}
          </button>
        </div>
      </div>

      {/* ── TOP-LEVEL TAB BAR ── */}
      <div className="flex items-center gap-2 border-b border-[#E7E0D8] pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSettingsTab('business')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            settingsTab === 'business'
              ? 'bg-[#B91C1C] text-white shadow-xs'
              : 'text-[#57534E] hover:bg-[#F3EFEA] hover:text-[#1C1917]'
          }`}
        >
          <Building size={15} />
          <span>Client Business Hub</span>
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
          <span>Email Template Center</span>
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
          <span>Tax Engine & GST Split →</span>
        </Link>
      </div>

      {/* ── TAB CONTENT ── */}
      {settingsTab === 'emails' ? (
        <EmailTemplateManager />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ── SIDEBAR NAVIGATION FOR SECTIONS ── */}
          <div className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-[#E7E0D8] shadow-xs overflow-hidden sticky top-20">
            <div className="p-3.5 bg-[#FBF9F5] border-b border-[#E7E0D8] flex items-center justify-between">
              <span className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5">
                <Store size={14} className="text-[#B91C1C]" /> Business Sections
              </span>
              <span className="text-[10px] font-bold text-[#78716C] bg-white px-2 py-0.5 rounded-full border border-[#E7E0D8]">
                8 Modules
              </span>
            </div>

            <div className="flex flex-col p-2 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveSection('identity')}
                className={`text-left px-3 py-2.5 rounded-xl font-bold flex items-center justify-between transition-all ${
                  activeSection === 'identity'
                    ? 'bg-[#FEF2F2] text-[#B91C1C] font-extrabold shadow-2xs'
                    : 'text-[#57534E] hover:bg-[#F3EFEA]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building size={16} />
                  <span>1. Brand & Identity</span>
                </div>
                {activeSection === 'identity' && <ChevronRight size={14} />}
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('contact')}
                className={`text-left px-3 py-2.5 rounded-xl font-bold flex items-center justify-between transition-all ${
                  activeSection === 'contact'
                    ? 'bg-[#FEF2F2] text-[#B91C1C] font-extrabold shadow-2xs'
                    : 'text-[#57534E] hover:bg-[#F3EFEA]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MapPin size={16} />
                  <span>2. Location & Contact</span>
                </div>
                {activeSection === 'contact' && <ChevronRight size={14} />}
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('schedule')}
                className={`text-left px-3 py-2.5 rounded-xl font-bold flex items-center justify-between transition-all ${
                  activeSection === 'schedule'
                    ? 'bg-[#FEF2F2] text-[#B91C1C] font-extrabold shadow-2xs'
                    : 'text-[#57534E] hover:bg-[#F3EFEA]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock size={16} />
                  <span>3. Operating Hours & Time</span>
                </div>
                {activeSection === 'schedule' && <ChevronRight size={14} />}
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('delivery')}
                className={`text-left px-3 py-2.5 rounded-xl font-bold flex items-center justify-between transition-all ${
                  activeSection === 'delivery'
                    ? 'bg-[#FEF2F2] text-[#B91C1C] font-extrabold shadow-2xs'
                    : 'text-[#57534E] hover:bg-[#F3EFEA]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Truck size={16} />
                  <span>4. Delivery & Order Rules</span>
                </div>
                {activeSection === 'delivery' && <ChevronRight size={14} />}
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('compliance')}
                className={`text-left px-3 py-2.5 rounded-xl font-bold flex items-center justify-between transition-all ${
                  activeSection === 'compliance'
                    ? 'bg-[#FEF2F2] text-[#B91C1C] font-extrabold shadow-2xs'
                    : 'text-[#57534E] hover:bg-[#F3EFEA]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={16} />
                  <span>5. GST, FSSAI & Invoices</span>
                </div>
                {activeSection === 'compliance' && <ChevronRight size={14} />}
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('payments')}
                className={`text-left px-3 py-2.5 rounded-xl font-bold flex items-center justify-between transition-all ${
                  activeSection === 'payments'
                    ? 'bg-[#FEF2F2] text-[#B91C1C] font-extrabold shadow-2xs'
                    : 'text-[#57534E] hover:bg-[#F3EFEA]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard size={16} />
                  <span>6. Payments & Banking</span>
                </div>
                {activeSection === 'payments' && <ChevronRight size={14} />}
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('socials')}
                className={`text-left px-3 py-2.5 rounded-xl font-bold flex items-center justify-between transition-all ${
                  activeSection === 'socials'
                    ? 'bg-[#FEF2F2] text-[#B91C1C] font-extrabold shadow-2xs'
                    : 'text-[#57534E] hover:bg-[#F3EFEA]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe size={16} />
                  <span>7. Socials & Aggregators</span>
                </div>
                {activeSection === 'socials' && <ChevronRight size={14} />}
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('promos')}
                className={`text-left px-3 py-2.5 rounded-xl font-bold flex items-center justify-between transition-all ${
                  activeSection === 'promos'
                    ? 'bg-[#FEF2F2] text-[#B91C1C] font-extrabold shadow-2xs'
                    : 'text-[#57534E] hover:bg-[#F3EFEA]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Flame size={16} />
                  <span>8. Promos & Announcements</span>
                </div>
                {activeSection === 'promos' && <ChevronRight size={14} />}
              </button>
            </div>
          </div>

          {/* ── MAIN FORM AREA ── */}
          <form onSubmit={handleSave} className="flex-1 space-y-6 w-full">
            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 1. BRAND & IDENTITY */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <div className={activeSection === 'identity' ? 'block space-y-6' : 'hidden'}>
              {/* Brand Header Preview */}
              <div className="bg-white rounded-2xl p-6 border border-[#E7E0D8] shadow-xs space-y-5">
                <div className="border-b border-[#E7E0D8] pb-3">
                  <h2 className="font-serif font-bold text-[#1C1917] text-lg flex items-center gap-2">
                    <Building size={18} className="text-[#B91C1C]" /> Store Branding & Identity
                  </h2>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    Customize your client storefront brand name, subtitle, and logo appearing across the website, mobile navbar, emails, and bills.
                  </p>
                </div>

                {/* Live Header Logo Preview Box */}
                <div className="p-4 rounded-xl bg-[#0D0D11] border border-white/10 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#FF3B00] mb-1 font-bold">
                      Customer Navbar Header Preview
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        {logoDataUrl ? (
                          <div className="relative w-32 h-9">
                            <Image
                              src={logoDataUrl}
                              alt="Store Logo"
                              fill
                              className="object-contain object-left"
                            />
                          </div>
                        ) : (
                          <span className="font-heading font-extrabold text-2xl tracking-tight text-[#FF3B00]">
                            {formData.businessName ? formData.businessName.toUpperCase() : 'PIZZA EXPERT'}
                          </span>
                        )}

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
                  <div className="text-right text-[11px] text-zinc-400 hidden sm:block max-w-[200px]">
                    Updates real-time across customer navigation, checkout, and printed invoices.
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Store Brand Name <span className="text-[#B91C1C]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="input-field font-semibold"
                      placeholder="Pizza Expert"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Brand Badge Tag (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.brandBadge}
                      onChange={(e) => setFormData({ ...formData, brandBadge: e.target.value })}
                      className="input-field"
                      placeholder="PRO, PLUS, EST. 2024"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Location Subtitle / Branch <span className="text-[#B91C1C]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.locationTagline}
                      onChange={(e) => setFormData({ ...formData, locationTagline: e.target.value })}
                      className="input-field"
                      placeholder="ALLAPUR • PRAYAGRAJ"
                      required
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Business Bio & Short Description
                    </label>
                    <textarea
                      rows={2}
                      value={formData.businessBio}
                      onChange={(e) => setFormData({ ...formData, businessBio: e.target.value })}
                      className="input-field"
                      placeholder="Authentic wood-fired Neapolitan pizzeria serving slow-fermented crusts..."
                    />
                  </div>
                </div>

                {/* Logo & Asset Management */}
                <div className="border-t border-[#E7E0D8] pt-4">
                  <label className="block text-xs font-bold text-[#1C1917] mb-2">
                    Official Store Logo (Transparent PNG / SVG)
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    <div className="w-36 h-20 border-2 border-dashed border-[#E7E0D8] bg-[#FBF9F5] rounded-xl flex items-center justify-center relative overflow-hidden p-2">
                      {logoDataUrl ? (
                        <Image src={logoDataUrl} alt="Store Logo" fill className="object-contain p-2" />
                      ) : (
                        <span className="text-xs text-[#78716C] font-semibold text-center">
                          No Logo File
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMediaTarget('logo')
                            setMediaModalOpen(true)
                          }}
                          className="btn btn-outline text-xs inline-flex items-center gap-1.5 bg-white text-[#B91C1C] border-[#B91C1C]/40 hover:bg-[#B91C1C]/5 font-semibold"
                        >
                          <ImageIcon size={14} /> Choose from Library
                        </button>
                        <label className="btn btn-secondary text-xs inline-flex items-center gap-2 cursor-pointer">
                          <Upload size={14} /> Upload Custom Logo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                        {logoDataUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setLogoDataUrl(null)
                              toast.info('Logo reset to text brand')
                            }}
                            className="btn btn-outline text-xs text-stone-500 hover:text-stone-700"
                          >
                            Remove Logo
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-[#78716C]">
                        Recommended: Transparent PNG (approx 400x120px, &lt; 2MB).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Profile Details */}
              <div className="bg-white rounded-2xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
                <h2 className="font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3 flex items-center gap-2">
                  <Camera size={18} className="text-[#B91C1C]" /> Primary Client / Administrator Contact
                </h2>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#E7E0D8] bg-[#FBF9F5] flex items-center justify-center overflow-hidden relative shrink-0">
                    {formData.adminAvatarUrl ? (
                      <img
                        src={formData.adminAvatarUrl}
                        alt="Admin Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-[#B91C1C] font-serif font-bold text-lg uppercase">
                        {(formData.adminName || 'PM').slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 flex-1 w-full">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1C1917] mb-1">
                          Owner / Manager Full Name
                        </label>
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
                        <label className="block text-xs font-bold text-[#1C1917] mb-1">
                          Manager Alerts Email
                        </label>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMediaTarget('avatar')
                          setMediaModalOpen(true)
                        }}
                        className="btn btn-outline text-xs inline-flex items-center gap-1.5 bg-white text-[#B91C1C] border-[#B91C1C]/40 hover:bg-[#B91C1C]/5 font-semibold"
                      >
                        <ImageIcon size={14} /> Choose Avatar
                      </button>
                      <label className="btn btn-secondary text-xs inline-flex items-center gap-2 cursor-pointer">
                        <Upload size={14} /> Upload Avatar Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 2. LOCATION & CONTACT DETAILS */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <div className={activeSection === 'contact' ? 'block space-y-6' : 'hidden'}>
              <div className="bg-white rounded-2xl p-6 border border-[#E7E0D8] shadow-xs space-y-5">
                <div className="border-b border-[#E7E0D8] pb-3">
                  <h2 className="font-serif font-bold text-[#1C1917] text-lg flex items-center gap-2">
                    <MapPin size={18} className="text-[#B91C1C]" /> Physical Location & Contact Numbers
                  </h2>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    Contact details displayed on the public footer, contact page, WhatsApp order button, and customer receipts.
                  </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Primary Phone (Customer Hotline) <span className="text-[#B91C1C]">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-3 text-[#78716C]" />
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input-field pl-9 font-semibold"
                        placeholder="+91-9999999999"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      WhatsApp Orders & Support <span className="text-[#B91C1C]">*</span>
                    </label>
                    <div className="relative">
                      <MessageCircle size={14} className="absolute left-3 top-3 text-[#10B981]" />
                      <input
                        type="text"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className="input-field pl-9 font-semibold"
                        placeholder="919999999999"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Public Support Email <span className="text-[#B91C1C]">*</span>
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-3 text-[#78716C]" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input-field pl-9"
                        placeholder="hello@pizzaexpert.in"
                        required
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Full Physical Address <span className="text-[#B91C1C]">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="input-field"
                      placeholder="Shop No. 4, Ground Floor, Allapur Main Road, Prayagraj, Uttar Pradesh 211006"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Landmark / Delivery Direction
                    </label>
                    <textarea
                      rows={2}
                      value={formData.landmark}
                      onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                      className="input-field"
                      placeholder="Near Allapur Water Tank, Opposite SBI Branch"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Google Maps Embed URL (for Contact & About pages)
                    </label>
                    <input
                      type="text"
                      value={formData.googleMapsEmbedUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, googleMapsEmbedUrl: e.target.value })
                      }
                      className="input-field font-mono text-xs"
                      placeholder="https://maps.google.com/maps?q=Allapur,+Prayagraj..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Google Maps GPS Directions Link
                    </label>
                    <input
                      type="url"
                      value={formData.googleMapsDirectionsUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, googleMapsDirectionsUrl: e.target.value })
                      }
                      className="input-field text-xs"
                      placeholder="https://maps.google.com/?q=..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 3. OPERATING HOURS & TIME */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <div className={activeSection === 'schedule' ? 'block space-y-6' : 'hidden'}>
              <div className="bg-white rounded-2xl p-6 border border-[#E7E0D8] shadow-xs space-y-5">
                <div className="border-b border-[#E7E0D8] pb-3">
                  <h2 className="font-serif font-bold text-[#1C1917] text-lg flex items-center gap-2">
                    <Clock size={18} className="text-[#B91C1C]" /> Operating Hours & Kitchen Timings
                  </h2>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    Define daily opening & closing hours, kitchen preparation time, and delivery ETA.
                  </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Display Hours Text (Summary)
                    </label>
                    <input
                      type="text"
                      value={formData.operatingHoursText}
                      onChange={(e) =>
                        setFormData({ ...formData, operatingHoursText: e.target.value })
                      }
                      className="input-field"
                      placeholder="11:00 AM – 11:30 PM (All Days)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Avg. Kitchen Prep Time (Minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.prepTimeMinutes}
                      onChange={(e) =>
                        setFormData({ ...formData, prepTimeMinutes: Number(e.target.value) })
                      }
                      className="input-field"
                      min={5}
                      max={90}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Delivery Window Display Text
                    </label>
                    <input
                      type="text"
                      value={formData.deliveryTimeText}
                      onChange={(e) =>
                        setFormData({ ...formData, deliveryTimeText: e.target.value })
                      }
                      className="input-field"
                      placeholder="30-45 mins"
                    />
                  </div>
                </div>

                {/* Day by Day Schedule Table */}
                <div className="border-t border-[#E7E0D8] pt-4">
                  <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-3">
                    Weekly Schedule (Day-by-Day)
                  </h3>

                  <div className="space-y-2.5">
                    {DAYS_OF_WEEK.map((day) => {
                      const dayConfig = (formData.weeklySchedule as any)?.[day.key] || {
                        open: '11:00',
                        close: '23:30',
                        closed: false,
                      }

                      return (
                        <div
                          key={day.key}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#FBF9F5] border border-[#E7E0D8]"
                        >
                          <span className="text-xs font-bold text-[#1C1917] w-28">
                            {day.label}
                          </span>

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-[#78716C] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={dayConfig.closed}
                                onChange={(e) => {
                                  const updated = {
                                    ...formData.weeklySchedule,
                                    [day.key]: { ...dayConfig, closed: e.target.checked },
                                  }
                                  setFormData({ ...formData, weeklySchedule: updated })
                                }}
                                className="rounded text-[#B91C1C] focus:ring-[#B91C1C]"
                              />
                              <span className={dayConfig.closed ? 'text-[#B91C1C] font-bold' : ''}>
                                Closed this day
                              </span>
                            </label>

                            {!dayConfig.closed ? (
                              <div className="flex items-center gap-2 text-xs">
                                <input
                                  type="time"
                                  value={dayConfig.open}
                                  onChange={(e) => {
                                    const updated = {
                                      ...formData.weeklySchedule,
                                      [day.key]: { ...dayConfig, open: e.target.value },
                                    }
                                    setFormData({ ...formData, weeklySchedule: updated })
                                  }}
                                  className="input-field py-1 px-2 text-xs w-28 font-mono"
                                />
                                <span className="text-[#78716C]">to</span>
                                <input
                                  type="time"
                                  value={dayConfig.close}
                                  onChange={(e) => {
                                    const updated = {
                                      ...formData.weeklySchedule,
                                      [day.key]: { ...dayConfig, close: e.target.value },
                                    }
                                    setFormData({ ...formData, weeklySchedule: updated })
                                  }}
                                  className="input-field py-1 px-2 text-xs w-28 font-mono"
                                />
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-[#B91C1C] bg-[#FEF2F2] px-3 py-1 rounded-md">
                                Kitchen Closed
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 4. DELIVERY & ORDER RULES */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <div className={activeSection === 'delivery' ? 'block space-y-6' : 'hidden'}>
              <div className="bg-white rounded-2xl p-6 border border-[#E7E0D8] shadow-xs space-y-5">
                <div className="border-b border-[#E7E0D8] pb-3">
                  <h2 className="font-serif font-bold text-[#1C1917] text-lg flex items-center gap-2">
                    <Truck size={18} className="text-[#B91C1C]" /> Delivery Radius, Fees & Service Modes
                  </h2>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    Configure online delivery limits, minimum order totals, packaging charges, and supported service channels.
                  </p>
                </div>

                {/* Service Modes Toggles */}
                <div className="grid sm:grid-cols-4 gap-3 bg-[#FBF9F5] p-4 rounded-xl border border-[#E7E0D8]">
                  <label className="flex items-center gap-2.5 cursor-pointer bg-white p-3 rounded-lg border border-[#E7E0D8]">
                    <input
                      type="checkbox"
                      checked={formData.enableDelivery}
                      onChange={(e) =>
                        setFormData({ ...formData, enableDelivery: e.target.checked })
                      }
                      className="rounded text-[#B91C1C] focus:ring-[#B91C1C] h-4 w-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-[#1C1917] block">Home Delivery</span>
                      <span className="text-[10px] text-[#78716C]">Doorstep dispatch</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer bg-white p-3 rounded-lg border border-[#E7E0D8]">
                    <input
                      type="checkbox"
                      checked={formData.enableTakeaway}
                      onChange={(e) =>
                        setFormData({ ...formData, enableTakeaway: e.target.checked })
                      }
                      className="rounded text-[#B91C1C] focus:ring-[#B91C1C] h-4 w-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-[#1C1917] block">Self Pickup</span>
                      <span className="text-[10px] text-[#78716C]">Takeaway at counter</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer bg-white p-3 rounded-lg border border-[#E7E0D8]">
                    <input
                      type="checkbox"
                      checked={formData.enableDineIn}
                      onChange={(e) =>
                        setFormData({ ...formData, enableDineIn: e.target.checked })
                      }
                      className="rounded text-[#B91C1C] focus:ring-[#B91C1C] h-4 w-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-[#1C1917] block">Dine-In Tables</span>
                      <span className="text-[10px] text-[#78716C]">POS Restaurant seating</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer bg-white p-3 rounded-lg border border-[#E7E0D8]">
                    <input
                      type="checkbox"
                      checked={formData.enableCod}
                      onChange={(e) =>
                        setFormData({ ...formData, enableCod: e.target.checked })
                      }
                      className="rounded text-[#B91C1C] focus:ring-[#B91C1C] h-4 w-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-[#1C1917] block">Cash on Delivery</span>
                      <span className="text-[10px] text-[#78716C]">Allow COD checkout</span>
                    </div>
                  </label>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Max Delivery Radius (km)
                    </label>
                    <input
                      type="number"
                      value={formData.deliveryRadiusKm}
                      onChange={(e) =>
                        setFormData({ ...formData, deliveryRadiusKm: Number(e.target.value) })
                      }
                      className="input-field"
                      min={1}
                      max={50}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Standard Delivery Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.deliveryFee}
                      onChange={(e) =>
                        setFormData({ ...formData, deliveryFee: Number(e.target.value) })
                      }
                      className="input-field"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Free Delivery Threshold (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.freeDeliveryAbove}
                      onChange={(e) =>
                        setFormData({ ...formData, freeDeliveryAbove: Number(e.target.value) })
                      }
                      className="input-field"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Minimum Order Value (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.minOrderValue}
                      onChange={(e) =>
                        setFormData({ ...formData, minOrderValue: Number(e.target.value) })
                      }
                      className="input-field"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Eco Packaging / Box Charge (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.packagingCharge}
                      onChange={(e) =>
                        setFormData({ ...formData, packagingCharge: Number(e.target.value) })
                      }
                      className="input-field"
                      min={0}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 5. GST, FSSAI & INVOICING COMPLIANCE */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <div className={activeSection === 'compliance' ? 'block space-y-6' : 'hidden'}>
              <div className="bg-white rounded-2xl p-6 border border-[#E7E0D8] shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E0D8] pb-3">
                  <div>
                    <h2 className="font-serif font-bold text-[#1C1917] text-lg flex items-center gap-2">
                      <ShieldCheck size={18} className="text-[#B91C1C]" /> GST, FSSAI & Tax Compliance
                    </h2>
                    <p className="text-xs text-[#78716C] mt-0.5">
                      Government registrations, license codes, and customized receipt invoice notes.
                    </p>
                  </div>

                  <Link
                    href="/admin/settings/taxes"
                    className="btn btn-outline text-xs inline-flex items-center gap-1.5 text-[#B91C1C] border-[#B91C1C]/40 hover:bg-[#B91C1C]/5 font-bold shrink-0"
                  >
                    <Receipt size={14} /> Open Advanced Tax Engine →
                  </Link>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      GSTIN Registration No. (15-digit)
                    </label>
                    <input
                      type="text"
                      value={formData.gstinNumber}
                      onChange={(e) => setFormData({ ...formData, gstinNumber: e.target.value })}
                      className="input-field font-mono font-bold"
                      placeholder="09ABCDE1234F1Z5"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      FSSAI Food License No. (14-digit)
                    </label>
                    <input
                      type="text"
                      value={formData.fssaiNumber}
                      onChange={(e) => setFormData({ ...formData, fssaiNumber: e.target.value })}
                      className="input-field font-mono font-bold"
                      placeholder="12723999000123"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Business PAN / Trade License
                    </label>
                    <input
                      type="text"
                      value={formData.panNumber}
                      onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                      className="input-field font-mono font-bold uppercase"
                      placeholder="ABCDE1234F"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Default GST Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      value={formData.taxRate}
                      onChange={(e) =>
                        setFormData({ ...formData, taxRate: Number(e.target.value) })
                      }
                      className="input-field font-semibold"
                      min={0}
                      max={28}
                    />
                    <span className="text-[11px] text-[#78716C] mt-1 block">
                      Standard restaurant GST is 5% (2.5% CGST + 2.5% SGST)
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Custom Tax Invoice Footer Thank You Note
                    </label>
                    <textarea
                      rows={2}
                      value={formData.invoiceFooterNote}
                      onChange={(e) =>
                        setFormData({ ...formData, invoiceFooterNote: e.target.value })
                      }
                      className="input-field"
                      placeholder="Thank you for choosing Pizza Expert Prayagraj! For catering bookings, call..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 6. PAYMENTS & BANKING DETAILS */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <div className={activeSection === 'payments' ? 'block space-y-6' : 'hidden'}>
              <div className="bg-white rounded-2xl p-6 border border-[#E7E0D8] shadow-xs space-y-5">
                <div className="border-b border-[#E7E0D8] pb-3">
                  <h2 className="font-serif font-bold text-[#1C1917] text-lg flex items-center gap-2">
                    <CreditCard size={18} className="text-[#B91C1C]" /> Payment Gateways & Store Banking
                  </h2>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    Configure online payment processing (Razorpay), Counter UPI VPA, and Settlement Bank details.
                  </p>
                </div>

                {/* Razorpay Section */}
                <div className="p-4 rounded-xl bg-[#FBF9F5] border border-[#E7E0D8] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
                        Razorpay Gateway (Cards, NetBanking & UPI)
                      </h3>
                      <p className="text-[11px] text-[#78716C]">
                        Enables seamless one-click payments during customer checkout.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableRazorpay}
                        onChange={(e) =>
                          setFormData({ ...formData, enableRazorpay: e.target.checked })
                        }
                        className="rounded text-[#B91C1C] focus:ring-[#B91C1C] h-4 w-4"
                      />
                      <span className="text-xs font-bold text-[#1C1917]">Enable Gateway</span>
                    </label>
                  </div>

                  {formData.enableRazorpay && (
                    <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-[#E7E0D8]">
                      <div>
                        <label className="block text-xs font-bold text-[#1C1917] mb-1">
                          Razorpay Key ID
                        </label>
                        <input
                          type="text"
                          value={formData.razorpayKeyId}
                          onChange={(e) =>
                            setFormData({ ...formData, razorpayKeyId: e.target.value })
                          }
                          className="input-field font-mono text-xs"
                          placeholder="rzp_test_..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#1C1917] mb-1">
                          Razorpay Key Secret
                        </label>
                        <input
                          type="password"
                          value={formData.razorpayKeySecret}
                          onChange={(e) =>
                            setFormData({ ...formData, razorpayKeySecret: e.target.value })
                          }
                          className="input-field font-mono text-xs"
                          placeholder="••••••••••••••••"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* UPI & Bank Account Details */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Direct Counter UPI ID / VPA (for QR Standee & Receipts)
                    </label>
                    <input
                      type="text"
                      value={formData.upiId}
                      onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                      className="input-field font-mono font-bold text-xs"
                      placeholder="pizzaexpert@okhdfcbank"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="input-field"
                      placeholder="HDFC Bank Ltd."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.bankAccountNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, bankAccountNumber: e.target.value })
                      }
                      className="input-field font-mono text-xs"
                      placeholder="50200012345678"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={formData.bankIfsc}
                      onChange={(e) =>
                        setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })
                      }
                      className="input-field font-mono text-xs uppercase"
                      placeholder="HDFC0001234"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 7. SOCIALS, REVIEWS & AGGREGATORS */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <div className={activeSection === 'socials' ? 'block space-y-6' : 'hidden'}>
              <div className="bg-white rounded-2xl p-6 border border-[#E7E0D8] shadow-xs space-y-5">
                <div className="border-b border-[#E7E0D8] pb-3">
                  <h2 className="font-serif font-bold text-[#1C1917] text-lg flex items-center gap-2">
                    <Globe size={18} className="text-[#B91C1C]" /> Social Media & Food Portals
                  </h2>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    Connect customer reviews, social pages, and your Zomato / Swiggy listings. Leave fields empty if not in use.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Google Reviews Direct URL
                    </label>
                    <input
                      type="url"
                      value={formData.googleReviewsLink}
                      onChange={(e) =>
                        setFormData({ ...formData, googleReviewsLink: e.target.value })
                      }
                      className="input-field"
                      placeholder="https://g.page/r/..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Homepage Rating Badge Score
                    </label>
                    <input
                      type="text"
                      value={formData.reviewsRatingScore}
                      onChange={(e) =>
                        setFormData({ ...formData, reviewsRatingScore: e.target.value })
                      }
                      className="input-field font-mono font-bold"
                      placeholder="4.9 / 5.0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Instagram Profile URL
                    </label>
                    <input
                      type="url"
                      value={formData.instagramUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, instagramUrl: e.target.value })
                      }
                      className="input-field"
                      placeholder="https://instagram.com/..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Facebook Page URL
                    </label>
                    <input
                      type="url"
                      value={formData.facebookUrl}
                      onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                      className="input-field"
                      placeholder="https://facebook.com/..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Twitter / X Profile URL
                    </label>
                    <input
                      type="url"
                      value={formData.twitterUrl}
                      onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                      className="input-field"
                      placeholder="https://twitter.com/..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Zomato Restaurant Listing
                    </label>
                    <input
                      type="url"
                      value={formData.zomatoUrl}
                      onChange={(e) => setFormData({ ...formData, zomatoUrl: e.target.value })}
                      className="input-field"
                      placeholder="https://zomato.com/..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Swiggy Restaurant Listing
                    </label>
                    <input
                      type="url"
                      value={formData.swiggyUrl}
                      onChange={(e) => setFormData({ ...formData, swiggyUrl: e.target.value })}
                      className="input-field"
                      placeholder="https://swiggy.com/..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Homepage Reviews Section Title
                    </label>
                    <input
                      type="text"
                      value={formData.reviewsSectionTitle}
                      onChange={(e) =>
                        setFormData({ ...formData, reviewsSectionTitle: e.target.value })
                      }
                      className="input-field font-semibold"
                      placeholder="PRAYAGRAJ REVIEWS"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Homepage Reviews Section Subtitle
                    </label>
                    <textarea
                      rows={2}
                      value={formData.reviewsSectionSubtitle}
                      onChange={(e) =>
                        setFormData({ ...formData, reviewsSectionSubtitle: e.target.value })
                      }
                      className="input-field"
                      placeholder="Over 500+ verified 5-star ratings on Google from pizza lovers across Allahabad."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 8. PROMOS & ANNOUNCEMENTS */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <div className={activeSection === 'promos' ? 'block space-y-6' : 'hidden'}>
              <div className="bg-white rounded-2xl p-6 border border-[#E7E0D8] shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
                  <div>
                    <h2 className="font-serif font-bold text-[#1C1917] text-lg flex items-center gap-2">
                      <Flame size={18} className="text-[#FF3B00]" /> Top Flash Offer Banner
                    </h2>
                    <p className="text-xs text-[#78716C] mt-0.5">
                      Top marquee notice banner shown above the main navbar to all visitors.
                    </p>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enableFlashBanner}
                      onChange={(e) =>
                        setFormData({ ...formData, enableFlashBanner: e.target.checked })
                      }
                      className="rounded text-[#B91C1C] focus:ring-[#B91C1C] h-4 w-4"
                    />
                    <span className="text-xs font-bold text-[#1C1917]">Enable Banner</span>
                  </label>
                </div>

                {formData.enableFlashBanner && (
                  <div className="space-y-4 pt-2">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1C1917] mb-1">
                          Badge Label
                        </label>
                        <input
                          type="text"
                          value={formData.flashBannerBadge}
                          onChange={(e) =>
                            setFormData({ ...formData, flashBannerBadge: e.target.value })
                          }
                          className="input-field font-bold"
                          placeholder="FLASH OFFER"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#1C1917] mb-1">
                          Announcement Message
                        </label>
                        <input
                          type="text"
                          value={formData.flashBannerText}
                          onChange={(e) =>
                            setFormData({ ...formData, flashBannerText: e.target.value })
                          }
                          className="input-field"
                          placeholder="🔥 FLAT 20% OFF on all Wood-Fired Pizzas! Use code: PIZZA20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1C1917] mb-1">
                        Action Link URL (e.g. /menu)
                      </label>
                      <input
                        type="text"
                        value={formData.flashBannerLink}
                        onChange={(e) =>
                          setFormData({ ...formData, flashBannerLink: e.target.value })
                        }
                        className="input-field"
                        placeholder="/menu"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── STICKY SAVE ACTION BAR ── */}
            <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-[#E7E0D8] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#57534E]">
                <Info size={15} className="text-[#B91C1C]" />
                <span>Changes are saved instantly to the client database & local storage.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary btn-lg flex-1 sm:flex-initial flex items-center justify-center gap-2 shadow-md disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Saving Settings...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Save All Business Settings</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
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
          Loading Client Business Hub...
        </div>
      }
    >
      <AdminSettingsContent />
    </Suspense>
  )
}
