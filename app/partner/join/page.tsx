'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Bike, CheckCircle2, ShieldCheck, Sparkles,
  ArrowRight, Phone, MapPin, IndianRupee, Clock,
  FileCheck, Award, HeartHandshake, UserPlus, Check
} from 'lucide-react'
import { submitDriverApplication } from '@/app/actions/drivers'
import { toast } from 'sonner'

export default function JoinDeliveryPartnerPage() {
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    area: 'Allapur',
    vehicleType: 'bike',
    vehicleNumber: '',
    licenseNumber: '',
    payoutUpi: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Please fill in your name and phone number.')
      return
    }

    setIsSubmitting(true)
    const res = await submitDriverApplication(formData)
    setIsSubmitting(false)

    if (res.success) {
      setSubmittedAppId(res.applicationId || 'APP-982143')
      toast.success('🎉 Application Submitted Successfully!')
    } else {
      toast.error(res.error || 'Failed to submit application')
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] py-10 sm:py-16">
      <div className="container-custom max-w-3xl space-y-8">
        {/* Hero Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEF2F2] border border-[#FCA5A5] text-[#B91C1C] text-xs font-bold font-mono uppercase">
            <Sparkles size={14} />
            Rider Partner Recruitment • Prayagraj
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-black text-[#1C1917] tracking-tight">
            Deliver with Pizza Expert
          </h1>
          <p className="text-[#57534E] text-sm sm:text-base max-w-xl mx-auto">
            Earn up to <strong className="text-[#B91C1C]">₹25,000 / month</strong> delivering handcrafted hot pizzas from our Allapur kitchen. Get daily UPI payouts and flexible shifts.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-xs text-center space-y-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto text-lg">
              💰
            </div>
            <div className="font-bold text-xs sm:text-sm text-[#1C1917]">Daily Payouts</div>
            <div className="text-[11px] text-[#78716C]">Direct UPI transfer every evening</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-xs text-center space-y-1">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto text-lg">
              ⏱
            </div>
            <div className="font-bold text-xs sm:text-sm text-[#1C1917]">Flexible Shifts</div>
            <div className="text-[11px] text-[#78716C]">Full-time or evening/weekend shifts</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-xs text-center space-y-1">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center mx-auto text-lg">
              🍕
            </div>
            <div className="font-bold text-xs sm:text-sm text-[#1C1917]">Staff Pizza Meals</div>
            <div className="text-[11px] text-[#78716C]">Free meal on 5+ daily deliveries</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-xs text-center space-y-1">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto text-lg">
              🛡
            </div>
            <div className="font-bold text-xs sm:text-sm text-[#1C1917]">Fuel Bonus</div>
            <div className="text-[11px] text-[#78716C]">Extra ₹3/km on peak weekend hours</div>
          </div>
        </div>

        {/* Application Form or Success State */}
        {submittedAppId ? (
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-emerald-200 shadow-md text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl shadow-xs">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-700">
                Application Received
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#1C1917]">
                Welcome to the Fleet!
              </h2>
              <p className="text-xs sm:text-sm text-[#57534E] max-w-md mx-auto">
                Your rider partner application has been recorded. Our fleet manager will contact you within <strong>2 hours</strong>.
              </p>
            </div>

            {/* Application ID Pill */}
            <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-2xl p-4 max-w-md mx-auto text-left space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#78716C]">Application ID:</span>
                <span className="font-mono font-bold text-[#B91C1C] text-sm">{submittedAppId}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#78716C]">Preferred Area:</span>
                <span className="font-semibold text-[#1C1917]">{formData.area}, Prayagraj</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#78716C]">Vehicle:</span>
                <span className="font-semibold text-[#1C1917] capitalize">{formData.vehicleType} ({formData.vehicleNumber || 'Pending'})</span>
              </div>
            </div>

            {/* Next Steps Card */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-left max-w-md mx-auto space-y-2">
              <div className="font-bold text-[#92400E] flex items-center gap-1.5">
                <FileCheck size={16} />
                Next Step: Document Verification & Kit Collection
              </div>
              <p className="text-[#B45309]">
                Visit <strong>Pizza Expert Kitchen, Shop 4, Allapur Main Road</strong> anytime between 11:00 AM – 8:00 PM with your Driving License to collect your insulated pizza hot-bag and uniform.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/partner/deliveries" className="btn btn-primary btn-lg rounded-xl">
                <Bike size={18} /> Open Rider Hub
              </Link>
              <a
                href={`https://wa.me/919999999999?text=${encodeURIComponent(`Hi Pizza Expert, I submitted Rider Application #${submittedAppId}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp btn-lg rounded-xl"
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E7E0D8] shadow-md space-y-6"
          >
            <div className="border-b border-[#E7E0D8] pb-4">
              <h2 className="text-xl font-serif font-black text-[#1C1917]">
                Quick Rider Onboarding Form
              </h2>
              <p className="text-xs text-[#78716C] mt-1">
                Fill in your basic information to get onboarded and start delivering in Prayagraj today.
              </p>
            </div>

            {/* Step 1: Personal Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#B91C1C] flex items-center gap-1.5 font-mono">
                <span>1. Personal Information</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amit Kumar Verma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">Mobile Number (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="amit@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">Preferred Delivery Area *</label>
                  <select
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="input-field text-sm bg-white"
                  >
                    <option value="Allapur">Allapur & Matiyara Chauraha</option>
                    <option value="Civil Lines">Civil Lines & MG Marg</option>
                    <option value="George Town">George Town & Tagore Town</option>
                    <option value="Katra">Katra & University Area</option>
                    <option value="Naini">Naini & Industrial Area</option>
                    <option value="Anywhere in Prayagraj">Flexible / Entire City</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Vehicle Details */}
            <div className="space-y-4 pt-2 border-t border-[#E7E0D8]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#B91C1C] flex items-center gap-1.5 font-mono">
                <span>2. Vehicle & Driving License</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">Vehicle Type</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="input-field text-sm bg-white"
                  >
                    <option value="bike">Motorcycle (Hero/Bajaj/Honda)</option>
                    <option value="scooter">Scooter (Activa/Jupiter)</option>
                    <option value="ebike">Electric Scooter / EV</option>
                    <option value="bicycle">Bicycle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">Vehicle Plate Number</label>
                  <input
                    type="text"
                    placeholder="UP 70 AB 1234"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                    className="input-field text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">Driving License No.</label>
                  <input
                    type="text"
                    placeholder="UP-70-2024-0012345"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
                    className="input-field text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Payout Details */}
            <div className="space-y-4 pt-2 border-t border-[#E7E0D8]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#B91C1C] flex items-center gap-1.5 font-mono">
                <span>3. Daily Earnings Payout Account</span>
              </h3>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">UPI ID for Daily Payouts (GPay / PhonePe / Paytm)</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210@paytm or amit@okhdfcbank"
                  value={formData.payoutUpi}
                  onChange={(e) => setFormData({ ...formData, payoutUpi: e.target.value })}
                  className="input-field text-sm font-mono"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-[#E7E0D8]">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary btn-lg w-full rounded-2xl flex items-center justify-center gap-2 shadow-md"
              >
                {isSubmitting ? (
                  <span>Submitting Application...</span>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>Submit Delivery Partner Application</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-[#78716C] text-center mt-2">
                By applying, you agree to Pizza Expert delivery standards, hygiene rules, and insulated bag usage.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
