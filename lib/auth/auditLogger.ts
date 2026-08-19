import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Logs a sensitive administrative action to the immutable ledger.
 * This is called from Server Actions after Zod validation and RBAC checks pass.
 * 
 * @param userId The ID of the authenticated user performing the action.
 * @param actionName A unique string identifying the action (e.g., 'close_cashier_shift', 'void_pos_order')
 * @param payload The validated data payload submitted for the action.
 */
export async function logAdminAction(
  userId: string,
  actionName: string,
  payload: any
): Promise<void> {
  const supabase = createAdminClient()

  try {
    const { error } = await supabase.from('admin_action_log').insert({
      user_id: userId,
      action_name: actionName,
      payload: payload, // Supabase automatically handles JSONB conversion
    })

    if (error) {
      console.error(`[AUDIT_LOG_ERROR] Failed to log action '${actionName}' for user ${userId}:`, error.message)
      // We log the error but intentionally do not throw. 
      // We don't want a logging failure to block business-critical operations like closing a shift.
    }
  } catch (err: any) {
    console.error(`[AUDIT_LOG_EXCEPTION] Error logging action '${actionName}':`, err.message)
  }
}
