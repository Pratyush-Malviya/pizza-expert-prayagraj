import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AuditLogClient, { AuditLogItem } from './AuditLogClient'

export const metadata = {
  title: 'Audit Log & Activity Trace | Admin Portal',
}

export default async function AuditLogPage() {
  const supabase = await createClient()

  const cookieStore = await cookies()
  const isSimpleAdmin = cookieStore.get('simple_admin')?.value === 'true'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !isSimpleAdmin) {
    redirect('/login')
  }

  // Fetch recent 100 audit logs
  const { data: auditData } = await supabase
    .from('audit_log')
    .select('id, actor_id, action, target_table, target_id, before, after, ip_address, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const rawLogs = auditData || []

  // Fetch actor profile names
  const actorIds = Array.from(new Set(rawLogs.map(l => l.actor_id).filter(Boolean))) as string[]

  let actorMap: Record<string, string> = {}
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', actorIds)

    if (profiles) {
      profiles.forEach(p => {
        actorMap[p.id] = p.name || 'Staff User'
      })
    }
  }

  const logsList: AuditLogItem[] = rawLogs.map(l => ({
    ...l,
    actor_name: l.actor_id ? (actorMap[l.actor_id] || 'Staff User') : 'System / Service Role',
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black font-serif text-[#1C1917] tracking-tight uppercase">
            Security & Audit Log Trail
          </h1>
          <p className="text-sm text-[#A8A29E] mt-1">
            Complete compliance event log of administrative actions, role updates, and customer modifications.
          </p>
        </div>
      </div>

      <AuditLogClient initialLogs={logsList} />
    </div>
  )
}
