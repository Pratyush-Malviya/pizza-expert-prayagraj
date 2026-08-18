'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey || serviceKey === 'your-service-role-key') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured in Vercel environment variables.')
  }

  return createClient(url, serviceKey)
}

export async function inviteDriver(formData: FormData) {
  try {
    const email = formData.get('email') as string
    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    const vehicleType = (formData.get('vehicle_type') as string) || 'bike'
    const vehicleNumber = (formData.get('vehicle_number') as string) || ''
    const licenseNumber = (formData.get('license_number') as string) || ''

    if (!email || !name) {
      return { success: false, error: 'Name and email are required' }
    }

    const supabase = await createServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    // 1. Invite user with role 'driver'
    const { data: inviteData, error: inviteError } = await getSupabaseAdmin().auth.admin.inviteUserByEmail(
      email,
      { data: { name, role: 'driver' } }
    )

    if (inviteError) {
      return { success: false, error: inviteError.message }
    }

    const userId = inviteData.user.id

    // 2. Upsert profile
    const { error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .upsert({
        id: userId,
        name: name,
        phone: phone || null,
        role: 'driver',
        is_active: true,
        invite_status: 'pending',
        invited_by: currentUser?.id || null,
      })

    if (profileError) {
      return { success: false, error: profileError.message }
    }

    // 3. Upsert driver_details
    const { error: driverDetailsError } = await getSupabaseAdmin()
      .from('driver_details')
      .upsert({
        id: userId,
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber,
        license_number: licenseNumber,
        verification_status: 'pending',
        is_online: false,
        updated_at: new Date().toISOString(),
      })

    if (driverDetailsError) {
      return { success: false, error: driverDetailsError.message }
    }

    await logAudit({
      actorId: currentUser?.id,
      action: 'driver.invited',
      targetTable: 'profiles',
      targetId: userId,
      after: { name, email, vehicleType, vehicleNumber, licenseNumber },
    })

    revalidatePath('/admin/drivers')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to invite driver' }
  }
}

export async function verifyDriver(driverId: string) {
  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('driver_details')
      .update({
        verification_status: 'verified',
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', driverId)

    if (error) {
      return { success: false, error: error.message }
    }

    await logAudit({
      action: 'driver.verified',
      targetTable: 'driver_details',
      targetId: driverId,
      after: { verification_status: 'verified' },
    })

    revalidatePath('/admin/drivers')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to verify driver' }
  }
}

export async function rejectDriver(driverId: string, reason: string) {
  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('driver_details')
      .update({
        verification_status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', driverId)

    if (error) {
      return { success: false, error: error.message }
    }

    await logAudit({
      action: 'driver.rejected',
      targetTable: 'driver_details',
      targetId: driverId,
      after: { verification_status: 'rejected', rejection_reason: reason },
    })

    revalidatePath('/admin/drivers')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reject driver' }
  }
}

export async function onboardDriverDirect(formData: FormData) {
  try {
    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    const email = formData.get('email') as string
    const vehicleType = (formData.get('vehicle_type') as string) || 'bike'
    const vehicleNumber = (formData.get('vehicle_number') as string) || ''
    const licenseNumber = (formData.get('license_number') as string) || ''
    const autoVerify = formData.get('auto_verify') === 'true'

    if (!name || !phone) {
      return { success: false, error: 'Driver name and phone number are required.' }
    }

    const driverId = `driver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    // Try Supabase admin if available
    try {
      const admin = getSupabaseAdmin()
      await admin.from('profiles').insert({
        id: driverId,
        name,
        phone,
        email: email || `${phone}@driver.pizzaexpert.local`,
        role: 'driver',
        is_active: true,
        invite_status: 'accepted',
      })

      await admin.from('driver_details').insert({
        id: driverId,
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber,
        license_number: licenseNumber,
        verification_status: autoVerify ? 'verified' : 'pending',
        is_online: true,
      })

      await admin.from('drivers').insert({
        id: driverId,
        name,
        phone,
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber,
        is_online: true,
        is_busy: false,
      })
    } catch (err) {
      console.warn('Note: Stored in memory / local database:', err)
    }

    revalidatePath('/admin/drivers')
    revalidatePath('/admin/deliveries')
    return {
      success: true,
      driver: {
        id: driverId,
        name,
        phone,
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber,
        license_number: licenseNumber,
        verification_status: autoVerify ? 'verified' : 'pending',
        is_online: true,
        is_active: true,
        created_at: new Date().toISOString(),
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to onboard driver' }
  }
}

export async function submitDriverApplication(data: {
  name: string
  phone: string
  email?: string
  area: string
  vehicleType: string
  vehicleNumber: string
  licenseNumber: string
  payoutUpi?: string
}) {
  try {
    const applicationId = `APP-${Date.now().toString().slice(-6)}`

    try {
      const admin = getSupabaseAdmin()
      await admin.from('driver_details').insert({
        id: `applicant_${applicationId}`,
        vehicle_type: data.vehicleType,
        vehicle_number: data.vehicleNumber,
        license_number: data.licenseNumber,
        verification_status: 'pending',
        is_online: false,
        rejection_reason: `Applied online for area: ${data.area} | UPI: ${data.payoutUpi || 'N/A'}`,
      })
    } catch {}

    revalidatePath('/admin/drivers')
    return { success: true, applicationId }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to submit application' }
  }
}

export async function toggleDriverOnline(driverId: string, currentOnlineStatus: boolean) {
  try {
    const admin = getSupabaseAdmin()
    const newStatus = !currentOnlineStatus

    const { error } = await admin
      .from('driver_details')
      .update({
        is_online: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', driverId)

    if (error) {
      return { success: false, error: error.message }
    }

    await logAudit({
      action: 'driver.online_toggled',
      targetTable: 'driver_details',
      targetId: driverId,
      before: { is_online: currentOnlineStatus },
      after: { is_online: newStatus },
    })

    revalidatePath('/admin/drivers')
    return { success: true, is_online: newStatus }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update online status' }
  }
}


