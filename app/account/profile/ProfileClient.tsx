'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateNotificationPreferences, exportMyData, requestAccountDeactivation } from '@/app/actions/account'
import { toast } from 'sonner'
import { Save, Loader2, Download, Bell, ShieldAlert, User, Phone, Mail, Ban } from 'lucide-react'

export default function ProfileClient({ initialProfile, userId }: { initialProfile: any, userId: string }) {
  const [name, setName] = useState(initialProfile.name)
  const [phone, setPhone] = useState(initialProfile.phone)
  const [isSaving, setIsSaving] = useState(false)

  // Notification preferences
  const [prefs, setPrefs] = useState(initialProfile.notification_prefs || {
    email_orders: true,
    email_marketing: false,
    sms_orders: true,
    sms_marketing: false,
  })
  const [isSavingPrefs, setIsSavingPrefs] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ name, phone })
        .eq('id', userId)

      if (error) throw error

      toast.success('Profile updated successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSavePrefs() {
    setIsSavingPrefs(true)
    const res = await updateNotificationPreferences(prefs)
    setIsSavingPrefs(false)
    if (res.success) {
      toast.success('Notification preferences saved!')
    } else {
      toast.error(res.error || 'Failed to save preferences')
    }
  }

  async function handleExportData() {
    setIsExporting(true)
    const res = await exportMyData()
    setIsExporting(false)

    if (res.success && res.data) {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute('download', `my_pizza_expert_data_${new Date().toISOString().slice(0, 10)}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      toast.success('Your complete account data export has downloaded')
    } else {
      toast.error(res.error || 'Failed to export data')
    }
  }

  async function handleDeactivateAccount() {
    setIsDeactivating(true)
    const res = await requestAccountDeactivation()
    setIsDeactivating(false)

    if (res.success) {
      toast.success('Account deactivated. Signing out...')
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/login'
    } else {
      toast.error(res.error || 'Failed to deactivate account')
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* 1. Basic Profile Form */}
      <form onSubmit={handleSaveProfile} className="bg-white p-5 rounded-xl border border-[#E7E0D8] space-y-4 shadow-xs">
        <h2 className="font-bold text-[#1C1917] flex items-center gap-2 border-b border-[#E7E0D8] pb-3">
          <User size={18} className="text-[#B91C1C]" /> Personal Information
        </h2>

        <div>
          <label className="block text-xs font-semibold text-[#A8A29E] mb-1 uppercase tracking-wider">Email Address</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
            <input 
              type="email" 
              disabled
              value={initialProfile.email}
              className="w-full pl-9 pr-4 py-2 border border-[#E7E0D8] rounded-lg text-sm bg-[#FBF9F5] text-[#A8A29E] cursor-not-allowed"
            />
          </div>
          <p className="text-[10px] text-[#A8A29E] mt-1">Email address is managed by your primary login provider.</p>
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-[#A8A29E] mb-1 uppercase tracking-wider">Full Name</label>
          <input 
            type="text" 
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
            placeholder="e.g. Rahul Sharma"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#A8A29E] mb-1 uppercase tracking-wider">Phone Number</label>
          <div className="relative">
            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
              placeholder="e.g. 9876543210"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSaving}
          className="bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-lg text-xs uppercase tracking-wider font-bold py-2.5 px-5 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Personal Info
        </button>
      </form>

      {/* 2. Notification Preferences */}
      <div className="bg-white p-5 rounded-xl border border-[#E7E0D8] space-y-4 shadow-xs">
        <h2 className="font-bold text-[#1C1917] flex items-center gap-2 border-b border-[#E7E0D8] pb-3">
          <Bell size={18} className="text-[#D97706]" /> Notification Preferences
        </h2>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 bg-[#FBF9F5] border border-[#E7E0D8] rounded-lg cursor-pointer">
            <div>
              <span className="font-bold text-[#1C1917] block">Order Status Updates via Email</span>
              <span className="text-[#A8A29E]">Receive emails when your order is preparing or out for delivery.</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.email_orders}
              onChange={(e) => setPrefs({ ...prefs, email_orders: e.target.checked })}
              className="w-4 h-4 accent-[#B91C1C]"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-[#FBF9F5] border border-[#E7E0D8] rounded-lg cursor-pointer">
            <div>
              <span className="font-bold text-[#1C1917] block">Promotions & Offers via Email</span>
              <span className="text-[#A8A29E]">Exclusive promo codes, weekend deals, and new menu item alerts.</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.email_marketing}
              onChange={(e) => setPrefs({ ...prefs, email_marketing: e.target.checked })}
              className="w-4 h-4 accent-[#B91C1C]"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-[#FBF9F5] border border-[#E7E0D8] rounded-lg cursor-pointer">
            <div>
              <span className="font-bold text-[#1C1917] block">SMS / WhatsApp Order Dispatch Alerts</span>
              <span className="text-[#A8A29E]">Instant SMS with live driver tracking links when order is out.</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.sms_orders}
              onChange={(e) => setPrefs({ ...prefs, sms_orders: e.target.checked })}
              className="w-4 h-4 accent-[#B91C1C]"
            />
          </label>
        </div>

        <button
          onClick={handleSavePrefs}
          disabled={isSavingPrefs}
          className="bg-[#18181B] hover:bg-[#27272A] text-white rounded-lg text-xs uppercase tracking-wider font-bold py-2.5 px-5 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isSavingPrefs ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Preferences
        </button>
      </div>

      {/* 3. Data Privacy & Account Management */}
      <div className="bg-white p-5 rounded-xl border border-[#E7E0D8] space-y-4 shadow-xs">
        <h2 className="font-bold text-[#1C1917] flex items-center gap-2 border-b border-[#E7E0D8] pb-3">
          <ShieldAlert size={18} className="text-[#57534E]" /> Privacy & Account Management
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-[#FBF9F5] border border-[#E7E0D8] rounded-lg text-xs">
          <div>
            <span className="font-bold text-[#1C1917] block">Download My Personal Data</span>
            <span className="text-[#A8A29E]">Export a complete copy of your profile, addresses, and order history in JSON format.</span>
          </div>
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="px-3.5 py-2 bg-white border border-[#E7E0D8] text-[#1C1917] hover:bg-[#F4EFEA] font-bold rounded-lg flex items-center gap-1.5 shrink-0"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download Data
          </button>
        </div>

        <div className="p-3 border border-[#FCA5A5] bg-[#FEF2F2] rounded-lg text-xs space-y-2">
          <div className="flex items-center gap-2 text-[#991B1B] font-bold">
            <Ban size={15} /> Deactivate Account
          </div>
          <p className="text-[#7F1D1D]">
            Deactivating your account will disable login access and revoke active sessions. Your account will enter a 30-day grace period before permanent deletion.
          </p>

          {!showDeactivateConfirm ? (
            <button
              onClick={() => setShowDeactivateConfirm(true)}
              className="px-3 py-1.5 bg-[#B91C1C] text-white rounded-lg font-bold text-xs"
            >
              Deactivate My Account
            </button>
          ) : (
            <div className="pt-2 border-t border-[#FCA5A5] flex items-center gap-3">
              <span className="font-bold text-[#7F1D1D]">Are you sure?</span>
              <button
                onClick={handleDeactivateAccount}
                disabled={isDeactivating}
                className="px-3 py-1.5 bg-[#B91C1C] text-white rounded-lg font-bold text-xs flex items-center gap-1"
              >
                {isDeactivating && <Loader2 size={13} className="animate-spin" />} Yes, Confirm Deactivate
              </button>
              <button
                onClick={() => setShowDeactivateConfirm(false)}
                className="px-3 py-1.5 bg-white border border-[#E7E0D8] text-[#1C1917] rounded-lg font-bold text-xs"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
