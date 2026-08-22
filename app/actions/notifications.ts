'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function triggerBirthdayDealsAction() {
  const supabase = createAdminClient()

  try {
    const { data: customers, error } = await supabase
      .from('profiles')
      .select('id, name, phone, email')
      .not('phone', 'is', null)

    if (error) throw new Error(error.message)

    const dealsSent = (customers || []).map((c) => ({
      customerId: c.id,
      customerName: c.name || 'Valued Customer',
      phone: c.phone,
      promoCode: `BDAY-${c.phone?.slice(-4) || 'SPECIAL'}`,
      discount: '20% OFF',
    }))

    return { success: true, count: dealsSent.length, deals: dealsSent }
  } catch (err: any) {
    return { success: false, error: err.message, count: 0, deals: [] }
  }
}

export async function sendCustomerWhatsAppDealAction(phone: string, customerName: string, dealText?: string) {
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const message = `🎂 Happy Birthday, ${customerName}! 🍕\nEnjoy a special gift from Pizza Expert Prayagraj: ${
      dealText || 'Get 20% OFF on your entire birthday order!'
    }\nUse Code: BDAY20\nOrder online now: https://pizzaexpert.in/menu`

    const whatsappUrl = `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(message)}`
    return { success: true, whatsappUrl }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
