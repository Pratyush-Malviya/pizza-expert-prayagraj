import { createAdminClient, createClient } from './supabase/server'
import { headers } from 'next/headers'

export interface AuditLogParams {
  actorId?: string | null
  action: string
  targetTable?: string
  targetId?: string
  before?: Record<string, any> | null
  after?: Record<string, any> | null
}

export async function logAudit(params: AuditLogParams) {
  try {
    const supabase = await createClient()
    const adminSupabase = await createAdminClient()

    let actorId = params.actorId
    if (!actorId) {
      const { data: { user } } = await supabase.auth.getUser()
      actorId = user?.id || null
    }

    let ipAddress: string | null = null
    try {
      const headersList = await headers()
      ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || null
    } catch {
      // Ignore header access error if called outside request context
    }

    const { error } = await adminSupabase.from('audit_log').insert({
      actor_id: actorId,
      action: params.action,
      target_table: params.targetTable || null,
      target_id: params.targetId || null,
      before: params.before || null,
      after: params.after || null,
      ip_address: ipAddress,
    })

    if (error) {
      console.error('[logAudit] Error inserting audit log:', error)
    }
  } catch (err) {
    console.error('[logAudit] Unexpected error:', err)
  }
}
