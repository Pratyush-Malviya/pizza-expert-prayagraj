'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getFloorLayout, updateTableStatus, openTableSession, closeTableSession,
  transferTable, mergeTables, assignWaiter, createTable, createArea,
  type TableStatus
} from '@/app/actions/tables'
import {
  UtensilsCrossed, Users, Clock, Plus, ArrowRightLeft, Merge,
  CheckCircle2, Sparkles, AlertCircle, RefreshCw, Loader2,
  Search, Filter, ShoppingBag, DollarSign, X, Check, Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const STATUS_CONFIG: Record<TableStatus, { label: string; badgeBg: string; border: string; glow: string }> = {
  available: { label: 'Available', badgeBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', border: 'border-emerald-500/40 hover:border-emerald-500', glow: 'shadow-emerald-500/10' },
  occupied:  { label: 'Occupied',  badgeBg: 'bg-rose-500/10 text-rose-600 border-rose-500/30',       border: 'border-rose-500/40 hover:border-rose-500', glow: 'shadow-rose-500/10' },
  billing:   { label: 'Billing',   badgeBg: 'bg-purple-500/10 text-purple-600 border-purple-500/30',   border: 'border-purple-500/40 hover:border-purple-500', glow: 'shadow-purple-500/10' },
  cleaning:  { label: 'Cleaning',  badgeBg: 'bg-blue-500/10 text-blue-600 border-blue-500/30',       border: 'border-blue-500/40 hover:border-blue-500', glow: 'shadow-blue-500/10' },
  reserved:  { label: 'Reserved',  badgeBg: 'bg-amber-500/10 text-amber-600 border-amber-500/30',     border: 'border-amber-500/40 hover:border-amber-500', glow: 'shadow-amber-500/10' },
  blocked:   { label: 'Blocked',   badgeBg: 'bg-stone-500/10 text-stone-600 border-stone-500/30',     border: 'border-stone-400', glow: '' },
}

export default function FloorPlanPage() {
  const router = useRouter()
  const [areas, setAreas] = useState<any[]>([])
  const [tables, setTables] = useState<any[]>([])
  const [waiters, setWaiters] = useState<any[]>([])
  const [activeAreaId, setActiveAreaId] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // Drawer / Modal States
  const [selectedTable, setSelectedTable] = useState<any | null>(null)
  const [openModalType, setOpenModalType] = useState<'open_session' | 'transfer' | 'merge' | 'add_table' | null>(null)
  const [guestCount, setGuestCount] = useState(2)
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('')
  const [targetTableId, setTargetTableId] = useState<string>('')
  const [transferReason, setTransferReason] = useState('')
  const [newTableNumber, setNewTableNumber] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState(4)
  const [newTableAreaId, setNewTableAreaId] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // ── Load Floor Layout ──────────────────────────────────────────────────────
  const loadFloor = useCallback(async () => {
    const result = await getFloorLayout()
    if (result.success) {
      setAreas(result.areas)
      setTables(result.tables)
      if (result.areas.length > 0 && !newTableAreaId) {
        setNewTableAreaId(result.areas[0].id)
      }
    }
    setLoading(false)
  }, [newTableAreaId])

  useEffect(() => {
    loadFloor()

    // Fetch staff with waiter/staff roles
    const fetchWaiters = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, name, role')
        .in('role', ['waiter', 'staff', 'manager', 'super_admin'])
      setWaiters(data || [])
    }
    fetchWaiters()

    // Realtime Supabase Subscription
    const supabase = createClient()
    const channel = supabase
      .channel('pos-floor-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => {
        loadFloor()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => {
        loadFloor()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadFloor])

  // ── Filtered Tables ────────────────────────────────────────────────────────
  const filteredTables = tables.filter((t) => {
    const matchesArea = activeAreaId === 'all' || t.area_id === activeAreaId
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    const matchesSearch = !searchQuery || t.table_number.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesArea && matchesStatus && matchesSearch
  })

  // ── Summary Stats ──────────────────────────────────────────────────────────
  const totalTables = tables.length
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length
  const availableCount = tables.filter((t) => t.status === 'available').length
  const billingCount = tables.filter((t) => t.status === 'billing').length
  const cleaningCount = tables.filter((t) => t.status === 'cleaning').length
  const occupancyRate = totalTables > 0 ? Math.round((occupiedCount / totalTables) * 100) : 0

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleOpenTable = async () => {
    if (!selectedTable) return
    setActionLoading(true)
    const res = await openTableSession(selectedTable.id, guestCount, selectedWaiterId || undefined)
    setActionLoading(false)
    if (res.success) {
      toast.success(`Table ${selectedTable.table_number} is now Occupied`)
      setOpenModalType(null)
      loadFloor()
      // Seamlessly redirect to POS billing screen with this table preselected
      router.push(`/admin/pos?tableId=${selectedTable.id}&guests=${guestCount}`)
    } else {
      toast.error(res.error || 'Failed to open table')
    }
  }

  const handleMarkCleaned = async (tableId: string) => {
    setActionLoading(true)
    const res = await updateTableStatus(tableId, 'available')
    setActionLoading(false)
    if (res.success) {
      toast.success('Table marked clean & ready')
      setSelectedTable(null)
      loadFloor()
    } else toast.error(res.error)
  }

  const handleTransfer = async () => {
    if (!selectedTable || !targetTableId) return toast.error('Select target table')
    setActionLoading(true)
    const res = await transferTable(selectedTable.id, targetTableId, transferReason)
    setActionLoading(false)
    if (res.success) {
      toast.success(`Transferred to Table`)
      setOpenModalType(null)
      setSelectedTable(null)
      loadFloor()
    } else toast.error(res.error)
  }

  const handleMerge = async () => {
    if (!selectedTable || !targetTableId) return toast.error('Select table to merge with')
    setActionLoading(true)
    const res = await mergeTables(selectedTable.id, targetTableId)
    setActionLoading(false)
    if (res.success) {
      toast.success(`Merged tables successfully`)
      setOpenModalType(null)
      setSelectedTable(null)
      loadFloor()
    } else toast.error(res.error)
  }

  const handleCreateTable = async () => {
    if (!newTableNumber || !newTableAreaId) return toast.error('Fill table number and area')
    setActionLoading(true)
    const res = await createTable(newTableNumber, newTableCapacity, newTableAreaId)
    setActionLoading(false)
    if (res.success) {
      toast.success(`Table ${newTableNumber} created`)
      setOpenModalType(null)
      setNewTableNumber('')
      loadFloor()
    } else toast.error(res.error)
  }

  return (
    <div className="space-y-5">
      {/* ── Top Header & Stats ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E0D8]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#B91C1C] text-white flex items-center justify-center shadow-xs">
              <UtensilsCrossed size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#1C1917]">
                Floor Plan & Table Management
              </h1>
              <p className="text-xs text-[#78716C]">
                Real-time dining table status, active bills, table transfers & floor routing
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setOpenModalType('add_table')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E7E0D8] hover:bg-[#F4EFEA] text-[#1C1917] rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Plus size={14} /> Add Table
          </button>
          <Link
            href="/admin/pos"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#B91C1C] text-white rounded-xl text-xs font-bold hover:bg-[#991B1B] transition shadow-xs"
          >
            <ShoppingBag size={14} /> POS Terminal
          </Link>
          <button
            onClick={loadFloor}
            className="p-2 border border-[#E7E0D8] rounded-xl text-[#78716C] hover:bg-[#F4EFEA] transition"
            title="Refresh floor state"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── KPI Stat Badges ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-[#E7E0D8] rounded-xl p-3 shadow-xs">
          <span className="text-[11px] font-semibold text-[#78716C] block">Total Tables</span>
          <span className="text-xl font-bold text-[#1C1917]">{totalTables}</span>
        </div>
        <div className="bg-white border border-emerald-200/60 rounded-xl p-3 shadow-xs bg-emerald-50/20">
          <span className="text-[11px] font-semibold text-emerald-700 block">Available</span>
          <span className="text-xl font-bold text-emerald-700">{availableCount}</span>
        </div>
        <div className="bg-white border border-rose-200/60 rounded-xl p-3 shadow-xs bg-rose-50/20">
          <span className="text-[11px] font-semibold text-rose-700 block">Occupied ({occupancyRate}%)</span>
          <span className="text-xl font-bold text-rose-700">{occupiedCount}</span>
        </div>
        <div className="bg-white border border-purple-200/60 rounded-xl p-3 shadow-xs bg-purple-50/20">
          <span className="text-[11px] font-semibold text-purple-700 block">Billing</span>
          <span className="text-xl font-bold text-purple-700">{billingCount}</span>
        </div>
        <div className="bg-white border border-blue-200/60 rounded-xl p-3 shadow-xs bg-blue-50/20">
          <span className="text-[11px] font-semibold text-blue-700 block">Cleaning Needed</span>
          <span className="text-xl font-bold text-blue-700">{cleaningCount}</span>
        </div>
      </div>

      {/* ── Filter Bar: Area Tabs & Statuses ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E7E0D8] shadow-xs">
        {/* Area Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          <button
            onClick={() => setActiveAreaId('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0',
              activeAreaId === 'all'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'text-[#78716C] hover:bg-[#F4EFEA] hover:text-[#1C1917]'
            )}
          >
            All Areas ({tables.length})
          </button>
          {areas.map((a) => {
            const areaTables = tables.filter((t) => t.area_id === a.id)
            return (
              <button
                key={a.id}
                onClick={() => setActiveAreaId(a.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5',
                  activeAreaId === a.id
                    ? 'bg-[#B91C1C] text-white shadow-xs'
                    : 'text-[#78716C] hover:bg-[#F4EFEA] hover:text-[#1C1917]'
                )}
              >
                <span>{a.name}</span>
                <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full', activeAreaId === a.id ? 'bg-black/20' : 'bg-[#E7E0D8]')}>
                  {areaTables.length}
                </span>
              </button>
            )
          })}
        </div>

        {/* Status Filter + Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table…"
              className="w-full pl-7 pr-2.5 py-1.5 bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#B91C1C]/40"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#1C1917] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="available">🟢 Available</option>
            <option value="occupied">🔴 Occupied</option>
            <option value="billing">🟣 Billing</option>
            <option value="cleaning">🔵 Cleaning</option>
            <option value="reserved">🟡 Reserved</option>
          </select>
        </div>
      </div>

      {/* ── Table Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={28} className="animate-spin text-[#B91C1C]" />
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E7E0D8] p-12 text-center shadow-xs">
          <UtensilsCrossed size={36} className="mx-auto mb-2 text-[#A8A29E]" />
          <h3 className="font-bold text-[#1C1917]">No tables found</h3>
          <p className="text-xs text-[#78716C] mt-1">Try clearing your filters or create a new table</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {filteredTables.map((table) => {
            const config = STATUS_CONFIG[table.status as TableStatus] || STATUS_CONFIG.available
            const session = table.activeSession
            const order = session?.order
            const runningTotal = Number(order?.total || 0)
            const itemCount = (order?.order_items || []).reduce((acc: number, i: any) => acc + Number(i.quantity), 0)
            const minutesOccupied = session?.opened_at
              ? Math.max(1, Math.floor((Date.now() - new Date(session.opened_at).getTime()) / 60000))
              : null

            return (
              <div
                key={table.id}
                onClick={() => setSelectedTable(table)}
                className={cn(
                  'group relative bg-white rounded-2xl p-4 border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between min-h-[160px]',
                  config.border,
                  table.status === 'occupied' && 'ring-1 ring-rose-500/20',
                  table.status === 'billing' && 'ring-1 ring-purple-500/20'
                )}
              >
                {/* Header: Table No & Status */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-base text-[#1C1917] group-hover:text-[#B91C1C] transition-colors">
                        {table.table_number}
                      </span>
                      {table.merged_with && (
                        <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded font-bold">
                          MERGED
                        </span>
                      )}
                    </div>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', config.badgeBg)}>
                      {config.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#78716C] mb-2.5">
                    <span className="flex items-center gap-1">
                      <Users size={11} /> {table.capacity}p
                    </span>
                    {table.area?.name && (
                      <span className="text-[#A8A29E] truncate">· {table.area.name}</span>
                    )}
                  </div>
                </div>

                {/* Body Content based on Table State */}
                <div className="pt-2 border-t border-[#F4EFEA]">
                  {table.status === 'occupied' || table.status === 'billing' ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1C1917]">
                          ₹{runningTotal.toFixed(0)}
                        </span>
                        <span className="text-[10px] text-[#78716C]">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#A8A29E]">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock size={10} /> {minutesOccupied}m
                        </span>
                        {table.assigned_waiter?.name && (
                          <span className="truncate max-w-[80px]">
                            👤 {table.assigned_waiter.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : table.status === 'cleaning' ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                        <Sparkles size={12} /> Needs sanitizing
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkCleaned(table.id); }}
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold transition"
                      >
                        Cleaned ✓
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-[#A8A29E]">
                      <span>Ready for guests</span>
                      <span className="text-[#B91C1C] font-semibold group-hover:underline">Open →</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Table Action Drawer / Modal ── */}
      {selectedTable && !openModalType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E7E0D8] space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D8]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold font-serif text-[#1C1917]">
                    Table {selectedTable.table_number}
                  </h3>
                  <span className={cn('text-xs font-bold px-2.5 py-0.5 rounded-full border', STATUS_CONFIG[selectedTable.status as TableStatus]?.badgeBg)}>
                    {STATUS_CONFIG[selectedTable.status as TableStatus]?.label}
                  </span>
                </div>
                <p className="text-xs text-[#78716C] mt-0.5">
                  {selectedTable.area?.name || 'Dining Area'} · Capacity: {selectedTable.capacity} guests
                </p>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="p-1.5 rounded-full hover:bg-[#F4EFEA] text-[#78716C]"
              >
                <X size={18} />
              </button>
            </div>

            {/* If Table is Available */}
            {selectedTable.status === 'available' && (
              <div className="space-y-4">
                <p className="text-xs text-[#78716C]">
                  This table is currently available. Start a new dining session or take counter orders.
                </p>
                <button
                  onClick={() => setOpenModalType('open_session')}
                  className="w-full py-3 bg-[#B91C1C] text-white rounded-xl text-sm font-bold hover:bg-[#991B1B] transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <UtensilsCrossed size={16} /> Open Table & Take Order
                </button>
              </div>
            )}

            {/* If Table is Occupied or Billing */}
            {(selectedTable.status === 'occupied' || selectedTable.status === 'billing') && (
              <div className="space-y-4">
                {/* Active Session Summary */}
                <div className="bg-[#FBF9F5] rounded-2xl p-4 border border-[#E7E0D8] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#78716C]">Running Bill</span>
                    <span className="text-lg font-bold text-[#B91C1C]">
                      ₹{Number(selectedTable.activeSession?.order?.total || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Item preview */}
                  <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 border-t border-[#E7E0D8] pt-2">
                    {(selectedTable.activeSession?.order?.order_items || []).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs text-[#1C1917]">
                        <span>{item.quantity}× {item.product?.name || 'Item'}</span>
                        <span className="font-semibold font-mono">₹{(item.quantity * item.unit_price).toFixed(0)}</span>
                      </div>
                    ))}
                    {(!selectedTable.activeSession?.order?.order_items || selectedTable.activeSession?.order?.order_items.length === 0) && (
                      <p className="text-xs text-[#A8A29E] italic">No items billed to order yet</p>
                    )}
                  </div>
                </div>

                {/* Primary Actions */}
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    href={`/admin/pos?tableId=${selectedTable.id}`}
                    className="py-2.5 bg-[#B91C1C] text-white rounded-xl text-xs font-bold hover:bg-[#991B1B] transition text-center flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Add Items / Bill
                  </Link>

                  <button
                    onClick={() => setOpenModalType('transfer')}
                    className="py-2.5 bg-white border border-[#E7E0D8] text-[#1C1917] hover:bg-[#F4EFEA] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <ArrowRightLeft size={14} /> Move Table
                  </button>

                  <button
                    onClick={() => setOpenModalType('merge')}
                    className="py-2.5 bg-white border border-[#E7E0D8] text-[#1C1917] hover:bg-[#F4EFEA] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Merge size={14} /> Merge Table
                  </button>

                  <button
                    onClick={async () => {
                      await closeTableSession(selectedTable.id, 'cleaning')
                      toast.success('Session cleared; table marked for cleaning')
                      setSelectedTable(null)
                      loadFloor()
                    }}
                    className="py-2.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={14} /> Close Session
                  </button>
                </div>
              </div>
            )}

            {/* If Table is Cleaning */}
            {selectedTable.status === 'cleaning' && (
              <div className="space-y-4">
                <div className="bg-blue-50 text-blue-700 p-4 rounded-2xl border border-blue-200 text-xs">
                  ✨ This table has finished a session and is currently awaiting cleaning and sanitization.
                </div>
                <button
                  onClick={() => handleMarkCleaned(selectedTable.id)}
                  disabled={actionLoading}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <Check size={16} /> Mark as Cleaned & Available
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sub-Modal: Open Session ── */}
      {openModalType === 'open_session' && selectedTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E7E0D8] space-y-4">
            <h3 className="text-lg font-bold font-serif text-[#1C1917]">
              Open Table {selectedTable.table_number}
            </h3>

            <div>
              <label className="block text-xs font-bold text-[#78716C] mb-1.5">Number of Guests</label>
              <div className="flex items-center gap-3 bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl p-2">
                <button
                  onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-[#E7E0D8] flex items-center justify-center font-bold text-sm"
                >
                  -
                </button>
                <span className="flex-1 text-center font-bold text-base text-[#1C1917]">{guestCount}</span>
                <button
                  onClick={() => setGuestCount(guestCount + 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-[#E7E0D8] flex items-center justify-center font-bold text-sm"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#78716C] mb-1.5">Assign Waiter (Optional)</label>
              <select
                value={selectedWaiterId}
                onChange={(e) => setSelectedWaiterId(e.target.value)}
                className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C1917] focus:outline-none"
              >
                <option value="">Select Staff / Waiter</option>
                {waiters.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setOpenModalType(null)}
                className="flex-1 py-2.5 border border-[#E7E0D8] rounded-xl text-xs font-bold text-[#78716C] hover:bg-[#F4EFEA]"
              >
                Cancel
              </button>
              <button
                onClick={handleOpenTable}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-[#B91C1C] text-white rounded-xl text-xs font-bold hover:bg-[#991B1B] transition flex items-center justify-center gap-1.5"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirm & Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-Modal: Transfer Table ── */}
      {openModalType === 'transfer' && selectedTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E7E0D8] space-y-4">
            <h3 className="text-lg font-bold font-serif text-[#1C1917]">
              Move from Table {selectedTable.table_number}
            </h3>

            <div>
              <label className="block text-xs font-bold text-[#78716C] mb-1.5">Destination Table</label>
              <select
                value={targetTableId}
                onChange={(e) => setTargetTableId(e.target.value)}
                className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C1917] focus:outline-none"
              >
                <option value="">Select Available Table</option>
                {tables.filter((t) => t.id !== selectedTable.id && t.status === 'available').map((t) => (
                  <option key={t.id} value={t.id}>Table {t.table_number} ({t.area?.name || 'Area'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#78716C] mb-1.5">Reason (Optional)</label>
              <input
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="e.g. Guest wanted outdoor booth"
                className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setOpenModalType(null)}
                className="flex-1 py-2.5 border border-[#E7E0D8] rounded-xl text-xs font-bold text-[#78716C] hover:bg-[#F4EFEA]"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={actionLoading || !targetTableId}
                className="flex-1 py-2.5 bg-[#B91C1C] text-white rounded-xl text-xs font-bold hover:bg-[#991B1B] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />}
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-Modal: Merge Table ── */}
      {openModalType === 'merge' && selectedTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E7E0D8] space-y-4">
            <h3 className="text-lg font-bold font-serif text-[#1C1917]">
              Merge Table {selectedTable.table_number}
            </h3>
            <p className="text-xs text-[#78716C]">
              Merge another table with Table {selectedTable.table_number} to accommodate large party sizes.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#78716C] mb-1.5">Table to Merge In</label>
              <select
                value={targetTableId}
                onChange={(e) => setTargetTableId(e.target.value)}
                className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C1917] focus:outline-none"
              >
                <option value="">Select Table to Merge</option>
                {tables.filter((t) => t.id !== selectedTable.id).map((t) => (
                  <option key={t.id} value={t.id}>Table {t.table_number} ({t.status})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setOpenModalType(null)}
                className="flex-1 py-2.5 border border-[#E7E0D8] rounded-xl text-xs font-bold text-[#78716C] hover:bg-[#F4EFEA]"
              >
                Cancel
              </button>
              <button
                onClick={handleMerge}
                disabled={actionLoading || !targetTableId}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Merge size={14} />}
                Confirm Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-Modal: Add Table ── */}
      {openModalType === 'add_table' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E7E0D8] space-y-4">
            <h3 className="text-lg font-bold font-serif text-[#1C1917]">
              Create New Dining Table
            </h3>

            <div>
              <label className="block text-xs font-bold text-[#78716C] mb-1.5">Table Number / Label</label>
              <input
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                placeholder="e.g. T-06 or BAR-01"
                className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1917] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#78716C] mb-1.5">Capacity</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                  className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1917] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#78716C] mb-1.5">Area</label>
                <select
                  value={newTableAreaId}
                  onChange={(e) => setNewTableAreaId(e.target.value)}
                  className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl px-2.5 py-2 text-xs font-semibold text-[#1C1917] focus:outline-none"
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setOpenModalType(null)}
                className="flex-1 py-2.5 border border-[#E7E0D8] rounded-xl text-xs font-bold text-[#78716C] hover:bg-[#F4EFEA]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTable}
                disabled={actionLoading || !newTableNumber}
                className="flex-1 py-2.5 bg-[#B91C1C] text-white rounded-xl text-xs font-bold hover:bg-[#991B1B] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
