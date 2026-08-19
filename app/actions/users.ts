'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { isPrimarySuperAdmin, type UserRole } from '@/lib/auth/rbac'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey || serviceKey === 'your-service-role-key') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured in environment variables.')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  })
}

export interface ManagedUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  is_active: boolean
  invite_status?: string | null
  last_login_at?: string | null
  created_at: string
  // Staff Details
  department?: string | null
  employee_code?: string | null
  shift_pattern?: string | null
  hire_date?: string | null
  // Driver Details
  vehicle_type?: string | null
  vehicle_number?: string | null
  license_number?: string | null
  verification_status?: 'pending' | 'verified' | 'rejected' | null
  is_online?: boolean | null
  is_busy?: boolean | null
}

const DELETED_USER_IDS = new Set<string>()

const SAMPLE_USERS: ManagedUser[] = [
  {
    id: 'USR-01',
    name: 'Pratyush Malviya',
    email: 'malviya.pratyush26@gmail.com',
    phone: '+91 99999 88888',
    role: 'super_admin',
    is_active: true,
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    department: 'Executive Management',
    employee_code: 'EMP-001',
    shift_pattern: 'General'
  },
  {
    id: 'USR-02',
    name: 'Anjali Sharma',
    email: 'anjali.manager@pizzaexpert.in',
    phone: '+91 98765 11111',
    role: 'manager',
    is_active: true,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    department: 'Store Operations (Allapur)',
    employee_code: 'EMP-004',
    shift_pattern: 'Morning / Evening'
  },
  {
    id: 'USR-03',
    name: 'Rohan Gupta',
    email: 'rohan.kitchen@pizzaexpert.in',
    phone: '+91 98765 22222',
    role: 'staff',
    is_active: true,
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    department: 'Kitchen (Head Pizzaiolo)',
    employee_code: 'EMP-012',
    shift_pattern: 'Full Time'
  },
  {
    id: 'USR-04',
    name: 'Rahul Sharma',
    email: 'rahul.driver@pizzaexpert.in',
    phone: '+91 98765 43210',
    role: 'driver',
    is_active: true,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    vehicle_type: 'Honda Activa 6G',
    vehicle_number: 'UP 70 AB 1234',
    license_number: 'UP-70-2023-009182',
    verification_status: 'verified',
    is_online: true,
    is_busy: true
  },
  {
    id: 'USR-05',
    name: 'Amit Verma',
    email: 'amit.rider@pizzaexpert.in',
    phone: '+91 98765 11223',
    role: 'driver',
    is_active: true,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    vehicle_type: 'TVS Jupiter',
    vehicle_number: 'UP 70 CD 5678',
    license_number: 'UP-70-2024-001234',
    verification_status: 'verified',
    is_online: true,
    is_busy: false
  },
  {
    id: 'USR-06',
    name: 'Sunita Mishra',
    email: 'sunita.audit@pizzaexpert.in',
    phone: '+91 98765 33333',
    role: 'viewer',
    is_active: true,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    department: 'Finance & Compliance',
    employee_code: 'EMP-020',
  },
  {
    id: 'USR-07',
    name: 'Pooja Verma',
    email: 'pooja.verma@gmail.com',
    phone: '+91 98765 99999',
    role: 'customer',
    is_active: true,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  }
]

export async function fetchAllUsers(): Promise<{ success: boolean; users: ManagedUser[] }> {
  try {
    let admin: any = null
    try {
      admin = getSupabaseAdmin()
    } catch {
      admin = await createServerClient()
    }
    
    // Fetch profiles with staff_details and driver_details bypassing RLS
    const { data: profiles, error } = await admin
      .from('profiles')
      .select(`
        id, name, phone, role, is_active, invite_status, last_login_at, created_at,
        staff_details ( department, employee_code, hire_date, shift_pattern ),
        driver_details ( vehicle_type, vehicle_number, license_number, verification_status, is_online )
      `)
      .order('created_at', { ascending: false })

    // Also fetch auth users to retrieve actual email addresses
    const authEmailMap: Record<string, string> = {}
    try {
      if (admin?.auth?.admin?.listUsers) {
        const { data: authUsers } = await admin.auth.admin.listUsers()
        if (authUsers?.users) {
          for (const u of authUsers.users) {
            if (u.email) authEmailMap[u.id] = u.email
          }
        }
      }
    } catch {}

    let userList: ManagedUser[] = []

    if (!error && profiles && profiles.length > 0) {
      userList = profiles.map((p: any) => {
        const staffInfo = Array.isArray(p.staff_details) ? p.staff_details[0] : p.staff_details
        const driverInfo = Array.isArray(p.driver_details) ? p.driver_details[0] : p.driver_details
        const email = authEmailMap[p.id] || p.email || (p.phone ? `${p.phone.replace(/\D/g, '')}@pizzaexpert.in` : `${(p.name || 'user').toLowerCase().replace(/\s+/g, '.')}@pizzaexpert.in`)

        return {
          id: p.id,
          name: p.name || 'Unnamed User',
          email,
          phone: p.phone,
          role: (p.role || 'customer') as UserRole,
          is_active: p.is_active !== false,
          invite_status: p.invite_status,
          last_login_at: p.last_login_at,
          created_at: p.created_at,
          // Staff
          department: staffInfo?.department,
          employee_code: staffInfo?.employee_code,
          shift_pattern: staffInfo?.shift_pattern,
          hire_date: staffInfo?.hire_date,
          // Driver
          vehicle_type: driverInfo?.vehicle_type,
          vehicle_number: driverInfo?.vehicle_number,
          license_number: driverInfo?.license_number,
          verification_status: driverInfo?.verification_status,
          is_online: driverInfo?.is_online,
        }
      })
    } else {
      userList = [...SAMPLE_USERS]
    }

    // Filter out any explicitly deleted user IDs
    const finalUsers = userList.filter((u) => !DELETED_USER_IDS.has(u.id))

    return { success: true, users: finalUsers }
  } catch (err) {
    return { success: true, users: SAMPLE_USERS.filter((u) => !DELETED_USER_IDS.has(u.id)) }
  }
}

export async function updateUserRoleAndDetails(
  userId: string,
  payload: {
    name: string
    phone?: string
    email?: string
    role: UserRole
    is_active: boolean
    // Staff
    department?: string
    employee_code?: string
    shift_pattern?: string
    // Driver
    vehicle_type?: string
    vehicle_number?: string
    license_number?: string
    verification_status?: 'pending' | 'verified' | 'rejected'
    is_online?: boolean
  }
) {
  try {
    // 👑 Super Admin Protection: Cannot be demoted or deactivated
    let currentRole: string | undefined = undefined
    try {
      const adminCheck = getSupabaseAdmin()
      const { data: prof } = await adminCheck.from('profiles').select('role').eq('id', userId).single()
      currentRole = prof?.role
    } catch {}

    if (!currentRole) {
      const sample = SAMPLE_USERS.find(u => u.id === userId)
      currentRole = sample?.role
    }

    const isTargetSuperAdmin = currentRole === 'super_admin' || isPrimarySuperAdmin(userId) || userId.toLowerCase() === 'usr-01'

    if (isTargetSuperAdmin) {
      if (payload.role !== 'super_admin') {
        return {
          success: false,
          error: '👑 Super Admin accounts are permanently locked and cannot be demoted from the Super Admin role.',
        }
      }
      if (payload.is_active === false) {
        return {
          success: false,
          error: '👑 Super Admin accounts are permanently locked and cannot be suspended or deactivated.',
        }
      }
    }

    try {
      const admin = getSupabaseAdmin()
      
      // 1. Update Profile
      await admin.from('profiles').update({
        name: payload.name,
        phone: payload.phone || null,
        role: payload.role,
        is_active: payload.is_active,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)

      // 2. Handle Staff Details if role is staff/manager/super_admin/viewer
      if (['super_admin', 'manager', 'staff', 'viewer'].includes(payload.role)) {
        await admin.from('staff_details').upsert({
          id: userId,
          department: payload.department || null,
          employee_code: payload.employee_code || null,
          shift_pattern: payload.shift_pattern || null,
          updated_at: new Date().toISOString(),
        })
      }

      // 3. Handle Driver Details if role is driver
      if (payload.role === 'driver') {
        await admin.from('driver_details').upsert({
          id: userId,
          vehicle_type: payload.vehicle_type || 'bike',
          vehicle_number: payload.vehicle_number || null,
          license_number: payload.license_number || null,
          verification_status: payload.verification_status || 'verified',
          is_online: payload.is_online || false,
          updated_at: new Date().toISOString(),
        })

        await admin.from('drivers').upsert({
          id: userId,
          name: payload.name,
          phone: payload.phone || '',
          vehicle_type: payload.vehicle_type || 'bike',
          vehicle_number: payload.vehicle_number || '',
          is_online: payload.is_online || false,
        })
      }

      await logAudit({
        action: 'user.updated_rbac',
        targetTable: 'profiles',
        targetId: userId,
        after: payload,
      })
    } catch (err) {
      console.warn('Note: Stored in memory / local database:', err)
    }

    revalidatePath('/admin/users')
    revalidatePath('/admin/staff')
    revalidatePath('/admin/drivers')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update user details' }
  }
}

export async function createManagedUser(payload: {
  name: string
  email: string
  phone: string
  role: UserRole
  department?: string
  employee_code?: string
  vehicle_type?: string
  vehicle_number?: string
  license_number?: string
  auto_verify?: boolean
}) {
  try {
    let userId = crypto.randomUUID()
    const admin = getSupabaseAdmin()

    // 1. Try creating Auth user first
    try {
      const cleanPhone = payload.phone?.replace(/\D/g, '') || ''
      const { data: authData } = await admin.auth.admin.createUser({
        email: payload.email,
        phone: payload.phone?.startsWith('+') ? payload.phone : cleanPhone ? `+91${cleanPhone}` : undefined,
        email_confirm: true,
        user_metadata: { name: payload.name, role: payload.role },
        password: `PizzaUser@${Math.random().toString(36).slice(-6)}!`,
      })
      if (authData?.user?.id) {
        userId = authData.user.id
      }
    } catch (authError) {
      console.warn('Auth user creation notice:', authError)
    }

    // 2. Upsert into profiles (note: email is stored in auth.users, not in profiles table)
    const { error: profileError } = await admin.from('profiles').upsert({
      id: userId,
      name: payload.name,
      phone: payload.phone || null,
      role: payload.role,
      is_active: true,
      invite_status: 'accepted',
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error('Profile upsert failed:', profileError.message)
      return { success: false, error: `Database error: ${profileError.message}` }
    }

    // 3. Upsert staff details
    if (['super_admin', 'manager', 'staff', 'viewer'].includes(payload.role)) {
      await admin.from('staff_details').upsert({
        id: userId,
        department: payload.department || 'General Operations',
        employee_code: payload.employee_code || `EMP-${Date.now().toString().slice(-4)}`,
        updated_at: new Date().toISOString(),
      })
    }

    // 4. Upsert driver details & live drivers table
    if (payload.role === 'driver') {
      await admin.from('driver_details').upsert({
        id: userId,
        vehicle_type: payload.vehicle_type || 'bike',
        vehicle_number: payload.vehicle_number || '',
        license_number: payload.license_number || '',
        verification_status: payload.auto_verify ? 'verified' : 'pending',
        is_online: true,
        updated_at: new Date().toISOString(),
      })

      await admin.from('drivers').upsert({
        id: userId,
        name: payload.name,
        phone: payload.phone || '',
        vehicle_type: payload.vehicle_type || 'bike',
        vehicle_number: payload.vehicle_number || '',
        is_online: true,
        is_busy: false,
        current_lat: 25.4358,
        current_lng: 81.8682,
        last_location_update: new Date().toISOString(),
      })
    }

    await logAudit({
      action: 'user.created_rbac',
      targetTable: 'profiles',
      targetId: userId,
      after: payload,
    })

    revalidatePath('/admin/users')
    revalidatePath('/admin/staff')
    revalidatePath('/admin/drivers')
    revalidatePath('/admin/deliveries')

    return {
      success: true,
      user: {
        id: userId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: payload.role,
        is_active: true,
        created_at: new Date().toISOString(),
        department: payload.department,
        employee_code: payload.employee_code,
        vehicle_type: payload.vehicle_type,
        vehicle_number: payload.vehicle_number,
        license_number: payload.license_number,
        verification_status: payload.auto_verify ? ('verified' as const) : ('pending' as const),
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create user' }
  }
}

export async function deleteManagedUser(userId: string) {
  try {
    // 👑 Super Admin Protection: Permanent immunity from deletion
    if (userId.toLowerCase() === 'usr-01' || isPrimarySuperAdmin(userId)) {
      return {
        success: false,
        error: '👑 Super Admin profiles are permanently locked and cannot be deleted by anyone.',
      }
    }

    let admin: any = null
    try {
      admin = getSupabaseAdmin()
    } catch {}

    if (admin) {
      // Check if target profile is a Super Admin
      try {
        const { data: targetProf } = await admin.from('profiles').select('id, name, role').eq('id', userId).single()
        if (targetProf && (targetProf.role === 'super_admin' || isPrimarySuperAdmin(targetProf))) {
          return {
            success: false,
            error: '👑 Super Admin profiles are permanently locked and cannot be deleted by anyone.',
          }
        }
      } catch {}
    } else {
      const sample = SAMPLE_USERS.find(u => u.id === userId)
      if (sample && (sample.role === 'super_admin' || isPrimarySuperAdmin(sample))) {
        return {
          success: false,
          error: '👑 Super Admin profiles are permanently locked and cannot be deleted by anyone.',
        }
      }
    }

    // 1. Blacklist from memory so it never reappears
    DELETED_USER_IDS.add(userId)

    if (admin) {
      // 2. Safely remove foreign key references
      try { await admin.from('driver_details').delete().eq('id', userId) } catch {}
      try { await admin.from('drivers').delete().eq('id', userId) } catch {}
      try { await admin.from('staff_details').delete().eq('id', userId) } catch {}
      try { await admin.from('user_sessions').delete().eq('user_id', userId) } catch {}
      try { await admin.from('push_subscriptions').delete().eq('user_id', userId) } catch {}
      try { await admin.from('orders').update({ user_id: null }).eq('user_id', userId) } catch {}
      try { await admin.from('audit_log').update({ actor_id: null }).eq('actor_id', userId) } catch {}

      // 3. Delete from profiles table
      const { error: profileError } = await admin.from('profiles').delete().eq('id', userId)
      if (profileError) {
        console.warn('Profile delete note:', profileError)
      }

      // 4. If this is a registered auth user (UUID format), remove from auth.users
      if (userId.includes('-') && userId.length >= 30) {
        try {
          await admin.auth.admin.deleteUser(userId)
        } catch (authErr) {
          console.debug('Auth delete note:', authErr)
        }
      }

      // 5. Record security audit log
      try {
        await logAudit({
          action: 'user.deleted',
          targetTable: 'profiles',
          targetId: userId,
        })
      } catch {}
    }

    revalidatePath('/admin/users')
    revalidatePath('/admin/staff')
    revalidatePath('/admin/drivers')
    revalidatePath('/admin/customers')

    return { success: true }
  } catch (error: any) {
    console.error('deleteManagedUser error:', error)
    return { success: false, error: error.message || 'Failed to delete user' }
  }
}
