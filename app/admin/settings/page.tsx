'use client'

import { useState } from 'react'
import { Save, Building, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
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
