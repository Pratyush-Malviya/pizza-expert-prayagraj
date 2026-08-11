'use client'

import { useState } from 'react'
import { History, Search, Download, ChevronDown, ChevronRight, User, ShieldAlert, Filter, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface AuditLogItem {
  id: string
  actor_id: string | null
  actor_name?: string | null
  action: string
  target_table: string | null
  target_id: string | null
  before: any
  after: any
  ip_address: string | null
  created_at: string
}

export default function AuditLogClient({ initialLogs }: { initialLogs: AuditLogItem[] }) {
  const [logs] = useState<AuditLogItem[]>(initialLogs)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const actionTypes = Array.from(new Set(logs.map(l => l.action)))

  const filteredLogs = logs.filter(l => {
    const matchesSearch =
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.actor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.target_table || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.ip_address || '').includes(searchTerm)

    if (actionFilter !== 'all') {
      return matchesSearch && l.action === actionFilter
    }
    return matchesSearch
  })

  function handleExportCSV() {
    const headers = ['Timestamp', 'Actor Name', 'Actor ID', 'Action', 'Target Table', 'Target ID', 'IP Address']
    const rows = filteredLogs.map(l => [
      new Date(l.created_at).toLocaleString(),
      `"${l.actor_name || 'System / Service Role'}"`,
      l.actor_id || '',
      `"${l.action}"`,
      l.target_table || '',
      l.target_id || '',
      l.ip_address || ''
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `audit_log_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Audit Log CSV exported')
  }

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E7E0D8] shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by action, actor, target table, or IP address..."
            className="w-full pl-10 pr-4 py-2 border border-[#E7E0D8] rounded-lg text-sm focus:outline-none focus:border-[#B91C1C]"
          />
        </div>

        {/* Filter & Export */}
        <div className="flex items-center gap-3">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs font-medium border border-[#E7E0D8] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20"
          >
            <option value="all">All Event Actions ({actionTypes.length})</option>
            {actionTypes.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="bg-[#18181B] hover:bg-[#27272A] text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-[#E7E0D8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FBF9F5] border-b border-[#E7E0D8] text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0D8] text-sm">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#A8A29E] text-sm">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedId === log.id
                  return (
                    <tr key={log.id} className="group">
                      <td className="py-3.5 px-4 font-mono text-xs" colSpan={7}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : log.id)}
                              className="p-1 rounded-md text-[#A8A29E] hover:text-[#1C1917] hover:bg-[#F4EFEA]"
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>

                            <span className="text-xs text-[#78716C] flex items-center gap-1 font-mono">
                              <Clock size={12} /> {new Date(log.created_at).toLocaleString()}
                            </span>

                            <span className="font-bold text-[#1C1917] flex items-center gap-1.5">
                              <User size={13} className="text-[#A8A29E]" /> {log.actor_name || 'System Action'}
                            </span>

                            <span className="px-2 py-0.5 rounded-md bg-[#FEF2F2] text-[#B91C1C] font-mono text-[11px] font-bold">
                              {log.action}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-[#A8A29E]">
                            {log.target_table && (
                              <span>Target: <strong className="text-[#57534E]">{log.target_table}</strong></span>
                            )}
                            {log.ip_address && (
                              <span className="font-mono">{log.ip_address}</span>
                            )}
                          </div>
                        </div>

                        {/* Collapsible Before / After JSON Diff */}
                        {isExpanded && (
                          <div className="mt-3 p-4 bg-[#18181B] text-white rounded-xl space-y-3 font-mono text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <span className="text-[#A8A29E] text-[10px] uppercase font-bold tracking-wider block mb-1">Before State</span>
                                <pre className="bg-[#27272A] p-3 rounded-lg overflow-x-auto text-[#FCA5A5]">
                                  {log.before ? JSON.stringify(log.before, null, 2) : 'null'}
                                </pre>
                              </div>
                              <div>
                                <span className="text-[#A8A29E] text-[10px] uppercase font-bold tracking-wider block mb-1">After State</span>
                                <pre className="bg-[#27272A] p-3 rounded-lg overflow-x-auto text-[#86EFAC]">
                                  {log.after ? JSON.stringify(log.after, null, 2) : 'null'}
                                </pre>
                              </div>
                            </div>
                            <div className="text-[10px] text-[#A8A29E]">
                              Log Event ID: {log.id} • Target ID: {log.target_id || 'N/A'}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
