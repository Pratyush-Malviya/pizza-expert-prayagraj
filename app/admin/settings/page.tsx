'use client'

import { useState } from 'react'
import { Save, Building, CreditCard, Image as ImageIcon, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import Image from 'next/image'

export default function AdminSettingsPage() {
  const logoDataUrl = useSettingsStore((state) => state.logoDataUrl)
  const setLogoDataUrl = useSettingsStore((state) => state.setLogoDataUrl)

  const [settings, setSettings] = useState({
    businessName: 'Pizza Expert Prayagraj',
    phone: '+91-9999999999',
    whatsapp: '919999999999',
    email: 'info@pizzaexpert.in',
    address: 'Allapur, Prayagraj, Uttar Pradesh 211006',
    deliveryFee: 30,
    freeDeliveryAbove: 499,
    taxRate: 5,
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#1C1917]">
          Store Settings
        </h1>
        <p className="text-[#57534E] text-xs sm:text-sm">
          Configure business details, tax rates, delivery charges, and contact info.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
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

        {/* General Info */}
        <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
          <h2 className="font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3 flex items-center gap-2">
            <Building size={18} className="text-[#B91C1C]" /> Business Info
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Business Name</label>
              <input
                type="text"
                value={settings.businessName}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Phone</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">WhatsApp Number</label>
              <input
                type="text"
                value={settings.whatsapp}
                onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Contact Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Pricing & Tax */}
        <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
          <h2 className="font-serif font-bold text-[#1C1917] text-lg border-b border-[#E7E0D8] pb-3 flex items-center gap-2">
            <CreditCard size={18} className="text-[#15803D]" /> Tax & Delivery Charges
          </h2>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Delivery Fee (₹)</label>
              <input
                type="number"
                value={settings.deliveryFee}
                onChange={(e) => setSettings({ ...settings, deliveryFee: Number(e.target.value) })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">Free Delivery Above (₹)</label>
              <input
                type="number"
                value={settings.freeDeliveryAbove}
                onChange={(e) => setSettings({ ...settings, freeDeliveryAbove: Number(e.target.value) })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">GST Tax Rate (%)</label>
              <input
                type="number"
                value={settings.taxRate}
                onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })}
                className="input-field"
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg flex items-center gap-2">
          <Save size={17} /> Save Settings
        </button>
      </form>
    </div>
  )
}
