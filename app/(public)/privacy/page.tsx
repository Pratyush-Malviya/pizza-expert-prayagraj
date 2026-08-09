import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Pizza Expert Prayagraj',
}

export default function PrivacyPage() {
  return (
    <div className="bg-[#FBF9F5] min-h-screen py-12">
      <div className="container-custom max-w-3xl bg-white rounded-xl p-8 sm:p-12 border border-[#E7E0D8] shadow-xs space-y-6">
        <h1 className="text-3xl font-serif font-bold text-[#1C1917] border-b border-[#E7E0D8] pb-4">
          Privacy Policy
        </h1>
        <p className="text-xs text-[#A8A29E]">Last updated: August 2026</p>

        <section className="space-y-2 text-xs sm:text-sm text-[#57534E] leading-relaxed">
          <h2 className="font-serif font-bold text-[#1C1917] text-base">1. Information We Collect</h2>
          <p>
            When you order online from Pizza Expert Prayagraj, we collect necessary personal details to process your order: name, delivery address, phone number, and email address. We do not store sensitive payment details like credit card numbers or UPI PINs; all transactions are securely processed by Razorpay and Cashfree.
          </p>
        </section>

        <section className="space-y-2 text-xs sm:text-sm text-[#57534E] leading-relaxed">
          <h2 className="font-serif font-bold text-[#1C1917] text-base">2. How We Use Your Information</h2>
          <p>
            Your information is strictly used to process and deliver your order, communicate order status via SMS/WhatsApp, send promotional offers (if subscribed), and improve our website performance.
          </p>
        </section>

        <section className="space-y-2 text-xs sm:text-sm text-[#57534E] leading-relaxed">
          <h2 className="font-serif font-bold text-[#1C1917] text-base">3. Data Security & Third Parties</h2>
          <p>
            We respect your privacy and will never sell or rent your personal data to third parties. We share data only with essential delivery and payment partners (e.g. Razorpay, Supabase) strictly for order fulfillment.
          </p>
        </section>
      </div>
    </div>
  )
}
