'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/requireUser'

// ─── Get Loyalty Rewards Catalog ────────────────────────────────────────────

export async function getLoyaltyRewards() {
  await requireUser(['cashier', 'waiter', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('loyalty_rewards')
    .select('*')
    .eq('is_active', true)
    .order('points_required', { ascending: true })

  if (error) return { success: false, error: error.message, rewards: [] }
  return { success: true, rewards: data || [] }
}

// ─── Earn Loyalty Points on Order (1 pt per ₹10 spent) ──────────────────────

export async function earnLoyaltyPoints(
  customerId: string,
  orderId: string,
  orderTotal: number,
  earnedBy?: string
) {
  const user = await requireUser(['cashier', 'manager', 'super_admin'])
  earnedBy = user.id // Override with authenticated user
  const supabase = createAdminClient()

  try {
    const pointsToEarn = Math.floor(orderTotal / 10)
    if (pointsToEarn <= 0) return { success: true, pointsEarned: 0 }

    // 1. Get current balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('loyalty_points')
      .eq('id', customerId)
      .single()

    const currentPoints = Number(profile?.loyalty_points || 0)
    const newBalance = currentPoints + pointsToEarn

    // 2. Update profile points
    await supabase
      .from('profiles')
      .update({ loyalty_points: newBalance })
      .eq('id', customerId)

    // 3. Log to Loyalty Ledger
    await supabase.from('loyalty_transactions').insert({
      customer_id: customerId,
      order_id: orderId,
      type: 'earn',
      points: pointsToEarn,
      balance_after: newBalance,
      note: `Earned ${pointsToEarn} points from order ₹${orderTotal.toFixed(0)}`,
      created_by: earnedBy || null,
    })

    revalidatePath('/admin/loyalty')
    return { success: true, pointsEarned: pointsToEarn, newBalance }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Redeem Loyalty Reward ──────────────────────────────────────────────────

export async function redeemLoyaltyReward(
  customerId: string,
  rewardId: string,
  orderId?: string
) {
  await requireUser(['cashier', 'manager', 'super_admin'])
  const supabase = createAdminClient()

  try {
    // 1. Fetch Reward & Customer Balance
    const [{ data: reward }, { data: profile }] = await Promise.all([
      supabase.from('loyalty_rewards').select('*').eq('id', rewardId).single(),
      supabase.from('profiles').select('loyalty_points').eq('id', customerId).single(),
    ])

    if (!reward) throw new Error('Reward not found')
    const currentPoints = Number(profile?.loyalty_points || 0)

    if (currentPoints < reward.points_required) {
      throw new Error(`Insufficient points. Need ${reward.points_required}, have ${currentPoints}`)
    }

    const newBalance = currentPoints - reward.points_required

    // 2. Deduct points from profile
    await supabase
      .from('profiles')
      .update({ loyalty_points: newBalance })
      .eq('id', customerId)

    // 3. Log to Loyalty Ledger
    await supabase.from('loyalty_transactions').insert({
      customer_id: customerId,
      order_id: orderId || null,
      type: 'redeem',
      points: -reward.points_required,
      balance_after: newBalance,
      note: `Redeemed: ${reward.name} (-${reward.points_required} pts)`,
    })

    revalidatePath('/admin/loyalty')
    return {
      success: true,
      reward,
      discountValue: reward.discount_value,
      rewardType: reward.reward_type,
      newBalance,
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Get Loyalty Ledger History ─────────────────────────────────────────────

export async function getLoyaltyLedgerHistory(customerId?: string, limit = 50) {
  await requireUser(['manager', 'super_admin', 'accountant'])
  const supabase = createAdminClient()

  let query = supabase
    .from('loyalty_transactions')
    .select(`
      *,
      customer:profiles!loyalty_transactions_customer_id_fkey(name, email, phone)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (customerId) query = query.eq('customer_id', customerId)

  const { data, error } = await query
  if (error) return { success: false, error: error.message, transactions: [] }
  return { success: true, transactions: data || [] }
}
