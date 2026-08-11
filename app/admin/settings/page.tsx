'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Save, Building, CreditCard, Image as ImageIcon, Upload, Link as LinkIcon, MapPin, Camera, LayoutTemplate, Flame } from 'lucide-react'
import { toast } from 'sonner'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import Image from 'next/image'

export default function AdminSettingsPage() {
  const storeSettings = useSettingsStore()
  const { logoDataUrl, setLogoDataUrl, updateSettings } = storeSettings

  // Local state for the form so we don't update the global store on every keystroke
  const [formData, setFormData] = useState({
    businessName: '',
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
  useEffect(() => {
    queueMicrotask(() => {
      setFormData({
        businessName: storeSettings.businessName,
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
        googleReviewsLink: storeSettings.googleReviewsLink,
        googleMapsEmbedUrl: storeSettings.googleMapsEmbedUrl,
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateSettings(formData)
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
      setLogoDataUrl(reader.result as string)
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
      setFormData({ ...formData, flashBannerImageUrl: reader.result as string })
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
      setFormData({ ...formData, adminAvatarUrl: reader.result as string })
      toast.success('Admin avatar photo uploaded!')
    }
    reader.readAsDataURL(file)
  }

  if (!mounted) return null

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#1C1917]">
          Store Settings
        </h1>
        <p className="text-[#57534E] text-xs sm:text-sm">
          Configure business details, admin profile, integrations, and payment gateways.
        </p>
      </div>

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
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">Admin Email Address</label>
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
              <div className="pt-2 flex items-center gap-4">
                <label className="btn btn-outline btn-xs inline-flex items-center gap-2 cursor-pointer relative overflow-hidden">
                  <Upload size={13} /> Upload Avatar Image
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleAvatarUpload}
                  />
                </label>
                {formData.adminAvatarUrl && (
                  <button
                    type="button"
                    onClick={() => { setFormData({ ...formData, adminAvatarUrl: '' }); toast.success('Avatar removed') }}
                    className="text-[#B91C1C] text-xs font-semibold hover:underline"
                  >
                    Remove avatar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Brand Logo */}
        <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
          <h2 className="font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3 flex items-center gap-2">
            <ImageIcon size={18} className="text-[#B91C1C]" /> Brand Logo
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl border-2 border-dashed border-[#E7E0D8] bg-[#FBF9F5] flex items-center justify-center overflow-hidden relative group shrink-0">
              {logoDataUrl ? (
                <Image src={logoDataUrl} alt="Store Logo" fill className="object-contain p-2" />
              ) : (
                <div className="text-[#A8A29E] flex flex-col items-center">
                  <ImageIcon size={32} />
                  <span className="text-[10px] mt-2 font-bold uppercase tracking-wider">No Logo</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="btn btn-outline btn-sm inline-flex items-center gap-2 cursor-pointer relative overflow-hidden">
                <Upload size={15} /> Upload New Logo
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp, image/svg+xml" 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleLogoUpload}
                />
              </label>
              <p className="text-[#A8A29E] text-xs">Recommended size: 500x500px (PNG, JPG, SVG). Max 2MB.</p>
              {logoDataUrl && (
                <button 
                  type="button" 
                  onClick={() => { setLogoDataUrl(null); toast.success('Logo removed') }}
                  className="text-[#B91C1C] text-xs font-semibold hover:underline block mt-2"
                >
                  Remove current logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Business Info */}
        <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
          <h2 className="font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3 flex items-center gap-2">
            <Building size={18} className="text-[#B91C1C]" /> Business Info
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Business Name</label>
              <input type="text" value={formData.businessName} onChange={(e) => setFormData({ ...formData, businessName: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Phone Number</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">WhatsApp Number</label>
              <input type="text" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Contact Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Address</label>
              <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input-field" required />
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
          <h2 className="font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3 flex items-center gap-2">
            <LinkIcon size={18} className="text-[#0284C7]" /> Social Media Links
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Instagram URL</label>
              <input type="url" value={formData.instagramUrl} onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })} className="input-field" placeholder="https://instagram.com/..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Facebook URL</label>
              <input type="url" value={formData.facebookUrl} onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })} className="input-field" placeholder="https://facebook.com/..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Twitter / X URL</label>
              <input type="url" value={formData.twitterUrl} onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })} className="input-field" placeholder="https://twitter.com/..." />
            </div>
          </div>
        </div>

        {/* Integrations & Maps */}
        <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
          <h2 className="font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3 flex items-center gap-2">
            <MapPin size={18} className="text-[#D97706]" /> Integrations & Maps
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Google Reviews URL</label>
              <input type="url" value={formData.googleReviewsLink} onChange={(e) => setFormData({ ...formData, googleReviewsLink: e.target.value })} className="input-field" placeholder="https://g.page/r/..." />
              <p className="text-xs text-[#57534E] mt-1">Used for the &quot;Leave a Review&quot; button.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Google Maps Embed URL</label>
              <textarea rows={2} value={formData.googleMapsEmbedUrl} onChange={(e) => setFormData({ ...formData, googleMapsEmbedUrl: e.target.value })} className="input-field" placeholder="https://maps.google.com/maps?..." />
              <p className="text-xs text-[#57534E] mt-1">The `src` attribute from a Google Maps embed iframe.</p>
            </div>
          </div>
        </div>

        {/* Features & Modules */}
        <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
          <h2 className="font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3 flex items-center gap-2">
            <LayoutTemplate size={18} className="text-[#7C3AED]" /> Features & Announcement Banners
          </h2>
          
          {/* Top Flash Offer Banner Settings */}
          <div className="p-4 bg-[#FBF9F5] border border-[#E7E0D8] rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-[#1C1917] flex items-center gap-1.5">
                  🔥 Top Flash Offer Banner
                </p>
                <p className="text-xs text-[#57534E]">Show a prominent announcement bar at the top of all website pages.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={formData.enableFlashBanner} onChange={(e) => setFormData({ ...formData, enableFlashBanner: e.target.checked })} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e10600]"></div>
              </label>
            </div>

            {formData.enableFlashBanner && (
              <div className="grid sm:grid-cols-3 gap-3 border-t border-[#E7E0D8] pt-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">Offer Text / Message</label>
                  <input type="text" value={formData.flashBannerText} onChange={(e) => setFormData({ ...formData, flashBannerText: e.target.value })} className="input-field bg-white" placeholder="e.g. FLAT 20% OFF on all Wood-Fired Pizzas! Use code: PIZZA20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">Badge Text</label>
                  <input type="text" value={formData.flashBannerBadge} onChange={(e) => setFormData({ ...formData, flashBannerBadge: e.target.value })} className="input-field bg-white" placeholder="FLASH OFFER" />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">Action Link URL</label>
                  <input type="text" value={formData.flashBannerLink} onChange={(e) => setFormData({ ...formData, flashBannerLink: e.target.value })} className="input-field bg-white" placeholder="/menu" />
                </div>
                <div className="sm:col-span-3 grid sm:grid-cols-[96px_1fr] gap-4 items-start">
                  <div className="relative w-24 h-16 rounded-lg border border-[#E7E0D8] bg-white overflow-hidden flex items-center justify-center">
                    {formData.flashBannerImageUrl ? (
                      <Image src={formData.flashBannerImageUrl} alt="Offer preview" fill className="object-cover" />
                    ) : (
                      <ImageIcon size={24} className="text-[#A8A29E]" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#1C1917]">Offer Image</label>
                    <input
                      type="text"
                      value={formData.flashBannerImageUrl}
                      onChange={(e) => setFormData({ ...formData, flashBannerImageUrl: e.target.value })}
                      className="input-field bg-white"
                      placeholder="Paste image URL or upload an image"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="btn btn-outline btn-sm inline-flex items-center gap-2 cursor-pointer relative overflow-hidden text-xs">
                        <Upload size={14} /> Upload Image
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleOfferImageUpload}
                        />
                      </label>
                      {formData.flashBannerImageUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, flashBannerImageUrl: '' })}
                          className="btn btn-outline btn-sm text-xs"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-[#0D0D11] border border-white/20 rounded-xl text-white shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FF3B00] text-white flex items-center justify-center font-bold shadow-md">
                <Flame size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">Homepage Flash Offers Carousel Manager</p>
                <p className="text-xs text-zinc-400">Add, edit, reorder, and customize dynamic offer slides on homepage.</p>
              </div>
            </div>
            <Link href="/admin/offers" className="btn bg-[#FF3B00] hover:bg-[#D63200] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg">
              Manage Slides →
            </Link>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#FBF9F5] border border-[#E7E0D8] rounded-lg">
            <div className="flex items-center gap-3">
              <Camera className="text-[#E1306C]" size={20} />
              <div>
                <p className="font-semibold text-sm text-[#1C1917]">Instagram Carousel</p>
                <p className="text-xs text-[#57534E]">Show a simulated Instagram feed on the homepage.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={formData.enableInstagramCarousel} onChange={(e) => setFormData({ ...formData, enableInstagramCarousel: e.target.checked })} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B91C1C]"></div>
            </label>
          </div>
        </div>

        {/* Payment Gateways */}
        <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
          <h2 className="font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3 flex items-center gap-2">
            <CreditCard size={18} className="text-[#15803D]" /> Payment Gateways
          </h2>
          
          <div className="flex items-center justify-between p-4 bg-[#FBF9F5] border border-[#E7E0D8] rounded-lg mb-4">
            <div>
              <p className="font-semibold text-sm text-[#1C1917]">Razorpay Integration</p>
              <p className="text-xs text-[#57534E]">Enable Razorpay for accepting online payments.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={formData.enableRazorpay} onChange={(e) => setFormData({ ...formData, enableRazorpay: e.target.checked })} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#15803D]"></div>
            </label>
          </div>

          {formData.enableRazorpay && (
            <div className="grid sm:grid-cols-2 gap-4 border-t border-[#E7E0D8] pt-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Razorpay Key ID</label>
                <input type="text" value={formData.razorpayKeyId} onChange={(e) => setFormData({ ...formData, razorpayKeyId: e.target.value })} className="input-field" placeholder="rzp_test_..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Razorpay Key Secret</label>
                <input type="password" value={formData.razorpayKeySecret} onChange={(e) => setFormData({ ...formData, razorpayKeySecret: e.target.value })} className="input-field" placeholder="Enter secret key" />
              </div>
            </div>
          )}
        </div>

        {/* Pricing & Tax */}
        <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
          <h2 className="font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3 flex items-center gap-2">
            <CreditCard size={18} className="text-[#1C1917]" /> Tax & Delivery Charges Configuration
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Standard Delivery Fee (₹)</label>
              <input type="number" value={formData.deliveryFee} onChange={(e) => setFormData({ ...formData, deliveryFee: Number(e.target.value) })} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Free Delivery Order Threshold (₹)</label>
              <input type="number" value={formData.freeDeliveryAbove} onChange={(e) => setFormData({ ...formData, freeDeliveryAbove: Number(e.target.value) })} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">GST Tax Rate (%)</label>
              <input type="number" value={formData.taxRate} onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Store GSTIN Registration No.</label>
              <input type="text" value={formData.gstinNumber} onChange={(e) => setFormData({ ...formData, gstinNumber: e.target.value })} className="input-field" placeholder="09ABCDE1234F1Z5" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">FSSAI License No.</label>
              <input type="text" value={formData.fssaiNumber} onChange={(e) => setFormData({ ...formData, fssaiNumber: e.target.value })} className="input-field" placeholder="12723999000123" />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg flex items-center gap-2">
          <Save size={17} /> Save All Settings
        </button>
      </form>
    </div>
  )
}
