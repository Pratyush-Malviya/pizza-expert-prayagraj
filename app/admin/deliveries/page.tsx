'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import {
  Bike, MapPin, Compass, Phone, ShieldCheck, Clock,
  CheckCircle2, AlertCircle, Search, ExternalLink, Plus, RefreshCw, UserCheck, Zap,
  Navigation, Flame, Loader2, Trash2, Layers, UtensilsCrossed, KeyRound,
  Sparkles, Check, ArrowRight, Gauge, Radio
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { DeliveryPartner, GPSLocation } from '@/lib/tracking/types'
import { STORE_LOCATION, STORE_DETAILS } from '@/lib/tracking/types'
import {
  autoAssignNearestAvailableDriver,
  batchAutoDispatchPendingOrders,
  reassignOrderDriver,
  purgeOldDeliveryActivities,
  fetchAvailableDrivers
} from '@/app/actions/deliveries'
import { useStoreStore } from '@/lib/store/useStoreStore'

const LiveDeliveryMap = dynamic(() => import('@/components/tracking/LiveDeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] rounded-2xl bg-[#FBF9F5] border border-[#E7E0D8] flex items-center justify-center text-xs font-mono text-[#78716C]">
      <Compass size={24} className="text-[#B91C1C] animate-spin mr-2" />
      <span>Loading Prayagraj Fleet GPS Radar...</span>
    </div>
  ),
})

export interface DeliveryRiderItem {
  id: string
  name: string
  phone: string
  vehicle_type: string
  vehicle_number: string
  rating: number
  total_deliveries: number
  is_online: boolean
  is_busy: boolean
  current_lat?: number
  current_lng?: number
  activeOrderId?: string
  destination?: string
  destinationCoords?: { lat: number; lng: number }
  eta?: string
  distanceKm?: number
}

export interface KitchenSyncOrder {
  id: string
  customer: string
  phone: string
  address: string
  items: string
  amount: number
  status: string
  created_at: string
  driverName?: string
  driverPhone?: string
  otpCode?: string
}

export default function AdminDeliveriesPage() {
  const { activeStoreId } = useStoreStore()
  const [activeTab, setActiveTab] = useState<'radar' | 'dispatch_queue' | 'kitchen_sync' | 'active_trips'>('radar')
  const [drivers, setDrivers] = useState<DeliveryRiderItem[]>([])
  const [allOrdersList, setAllOrdersList] = useState<any[]>([])
  const [kitchenOrders, setKitchenOrders] = useState<KitchenSyncOrder[]>([])
  const [unassignedOrders, setUnassignedOrders] = useState<any[]>([])
  const [activeTrips, setActiveTrips] = useState<any[]>([])
  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState(true)

  const [activeDeliveriesCount, setActiveDeliveriesCount] = useState(0)
  const [todayCompletedTrips, setTodayCompletedTrips] = useState(0)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [avgDeliveryTimeMinutes, setAvgDeliveryTimeMinutes] = useState(0)
  const [onTimeRate, setOnTimeRate] = useState(0)
  const [selectedRider, setSelectedRider] = useState<DeliveryRiderItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [dispatchingId, setDispatchingId] = useState<string | null>(null)
  const [isBatchDispatching, setIsBatchDispatching] = useState(false)
  const [isPurging, setIsPurging] = useState(false)
  const [reassignModalOrder, setReassignModalOrder] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'idle' | 'offline'>('all')

  const fetchFleetAndOrders = useCallback(async () => {
    try {
      const supabase = createClient()

      // 1. Fetch Real Driver Profiles & Details from Supabase
      const { data: driversProfiles } = await supabase
        .from('profiles')
        .select(`
          id, name, phone, is_active, role, created_at,
          driver_details ( vehicle_type, vehicle_number, license_number, verification_status, is_online )
        `)
        .eq('role', 'driver')
        .order('created_at', { ascending: false })

      // 2. Fetch Drivers live table for GPS coordinates & busy states
      let liveDriversQuery = supabase
        .from('drivers')
        .select('id, name, phone, vehicle_type, vehicle_number, is_online, is_busy, current_lat, current_lng')
      if (activeStoreId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeStoreId)) {
        liveDriversQuery = liveDriversQuery.eq('store_id', activeStoreId)
      }
      const { data: liveDriversTable } = await liveDriversQuery

      const liveDriversMap: Record<string, any> = {}
      if (liveDriversTable) {
        for (const ld of liveDriversTable) {
          liveDriversMap[ld.id] = ld
        }
      }

      // 3. Fetch Deliveries table records
      const { data: deliveriesData } = await supabase
        .from('deliveries')
        .select('*, driver:drivers(*)')

      const deliveryByOrderId: Record<string, any> = {}
      const deliveryByDriverId: Record<string, any> = {}
      if (deliveriesData) {
        deliveriesData.forEach((d: any) => {
          deliveryByOrderId[d.order_id] = d
          if (d.driver_id && ['assigned', 'accepted', 'picked_up', 'heading_to_customer', 'arrived'].includes(d.status)) {
            deliveryByDriverId[d.driver_id] = d
          }
        })
      }

      // 4. Fetch Orders from Database
      let ordersQuery = supabase
        .from('orders')
        .select('*, order_items(*, products(name))')
        .order('created_at', { ascending: false })
        .limit(100)
      if (activeStoreId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeStoreId)) {
        ordersQuery = ordersQuery.eq('store_id', activeStoreId)
      }
      const { data: allOrders } = await ordersQuery

      let ordersList: any[] = allOrders || []

      try {
        if (typeof window !== 'undefined') {
          const local = JSON.parse(localStorage.getItem('pizza_orders') || '[]')
          if (local.length > 0) {
            const dbIds = new Set(ordersList.map(o => o.id))
            const missing = local.filter((l: any) => !dbIds.has(l.id))
            ordersList = [...ordersList, ...missing]
          }
        }
      } catch {}

      setAllOrdersList(ordersList)

      // Active Out for Delivery orders
      const activeOrders = ordersList.filter(
        o => o.status === 'out_for_delivery' || o.status === 'assigned' || deliveryByOrderId[o.id]?.status === 'picked_up'
      )
      const activeOrderMap: Record<string, any> = {}
      activeOrders.forEach(o => {
        const dRec = deliveryByOrderId[o.id]
        const dId = o.driver_id || dRec?.driver_id
        if (dId) {
          activeOrderMap[dId] = o
        }
      })
      setActiveTrips(activeOrders)

      // Unassigned orders (confirmed or preparing but not yet assigned to any driver)
      const unassigned = ordersList.filter(o => {
        if (o.status !== 'confirmed' && o.status !== 'preparing') return false
        const dRec = deliveryByOrderId[o.id]
        return !o.driver_id && (!dRec || dRec.status === 'unassigned' || !dRec.driver_id)
      })
      setUnassignedOrders(unassigned)

      // Kitchen Sync orders (confirmed / preparing / out_for_delivery)
      const kitchenList: KitchenSyncOrder[] = ordersList
        .filter(o => ['confirmed', 'preparing', 'out_for_delivery', 'ready'].includes(o.status))
        .slice(0, 15)
        .map(o => {
          const addr = o.address_json || {}
          const itemsList = o.order_items || []
          const summaryStr = itemsList
            .map((i: any) => `${i.quantity}x ${i.products?.name || i.product_name || 'Pizza'}`)
            .join(', ') || o.items_summary || 'Oven Baked Item'
          const dRec = deliveryByOrderId[o.id]

          return {
            id: o.id,
            customer: addr.name || o.customer_name || 'Guest Customer',
            phone: addr.phone || o.customer_phone || 'N/A',
            address: [addr.line1, addr.line2, addr.city].filter(Boolean).join(', ') || o.delivery_address || 'Prayagraj',
            items: summaryStr,
            amount: Number(o.total) || 0,
            status: o.status,
            created_at: o.created_at,
            driverName: addr.driverName || dRec?.driver?.name,
            driverPhone: addr.driverPhone || dRec?.driver?.phone,
            otpCode: addr.deliveryOtp || dRec?.otp_code,
          }
        })
      setKitchenOrders(kitchenList)

      // Delivered today metrics
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

      const deliveredToday = ordersList.filter(o => {
        if (o.status !== 'delivered' && o.status !== 'completed') return false
        const orderTime = new Date(o.created_at || Date.now()).getTime()
        return orderTime >= startOfToday
      })

      const totalDeliveredRevenue = deliveredToday.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
      setTodayCompletedTrips(deliveredToday.length)
      setTodayRevenue(totalDeliveredRevenue)

      if (deliveredToday.length > 0) {
        let totalMins = 0
        let count = 0
        let onTimeCount = 0
        deliveredToday.forEach(o => {
          if (o.created_at && o.updated_at) {
            const diff = (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 60000
            if (diff > 0 && diff < 240) {
              totalMins += diff
              count++
              if (diff <= 30) onTimeCount++
            }
          }
        })
        if (count > 0) {
          setAvgDeliveryTimeMinutes(Math.round((totalMins / count) * 10) / 10)
          setOnTimeRate(Math.round((onTimeCount / count) * 100))
        } else {
          setAvgDeliveryTimeMinutes(0)
          setOnTimeRate(100)
        }
      } else {
        setAvgDeliveryTimeMinutes(0)
        setOnTimeRate(0)
      }

      // Combine Real Drivers strictly from Database
      const driverMap: Map<string, DeliveryRiderItem> = new Map()

      // From profiles
      if (driversProfiles && driversProfiles.length > 0) {
        for (const p of driversProfiles) {
          const details = Array.isArray(p.driver_details) ? p.driver_details[0] : p.driver_details
          const live = liveDriversMap[p.id]
          const activeOrd = activeOrderMap[p.id] || deliveryByDriverId[p.id]
          const addr = activeOrd?.address_json || {}

          const isOnline = live?.is_online ?? details?.is_online ?? true
          const isBusy = Boolean(activeOrd || live?.is_busy)

          driverMap.set(p.id, {
            id: p.id,
            name: p.name || 'Delivery Partner',
            phone: p.phone || '',
            vehicle_type: details?.vehicle_type || live?.vehicle_type || 'Bike',
            vehicle_number: details?.vehicle_number || live?.vehicle_number || 'UP 70',
            rating: 5.0,
            total_deliveries: deliveredToday.length,
            is_online: isOnline,
            is_busy: isBusy,
            current_lat: Number(live?.current_lat || STORE_LOCATION.lat),
            current_lng: Number(live?.current_lng || STORE_LOCATION.lng),
            activeOrderId: activeOrd?.id ? String(activeOrd.id).slice(0, 8) : undefined,
            destination: activeOrd ? ([addr.line1, addr.city].filter(Boolean).join(', ') || 'Prayagraj') : undefined,
            destinationCoords: { lat: 25.4528, lng: 81.8346 },
            eta: activeOrd ? '10-15 mins' : undefined,
            distanceKm: activeOrd ? 2.4 : undefined,
          })
        }
      }

      // From raw drivers table
      if (liveDriversTable && liveDriversTable.length > 0) {
        for (const ld of liveDriversTable) {
          if (!driverMap.has(ld.id)) {
            const activeOrd = activeOrderMap[ld.id] || deliveryByDriverId[ld.id]
            const addr = activeOrd?.address_json || {}
            driverMap.set(ld.id, {
              id: ld.id,
              name: ld.name || 'Delivery Partner',
              phone: ld.phone || '',
              vehicle_type: ld.vehicle_type || 'Bike',
              vehicle_number: ld.vehicle_number || 'UP 70',
              rating: 5.0,
              total_deliveries: deliveredToday.length,
              is_online: ld.is_online !== false,
              is_busy: Boolean(activeOrd || ld.is_busy),
              current_lat: Number(ld.current_lat || STORE_LOCATION.lat),
              current_lng: Number(ld.current_lng || STORE_LOCATION.lng),
              activeOrderId: activeOrd?.id ? String(activeOrd.id).slice(0, 8) : undefined,
              destination: activeOrd ? ([addr.line1, addr.city].filter(Boolean).join(', ') || 'Prayagraj') : undefined,
              destinationCoords: { lat: 25.4528, lng: 81.8346 },
              eta: activeOrd ? '10-15 mins' : undefined,
              distanceKm: activeOrd ? 2.4 : undefined,
            })
          }
        }
      }

      const formattedDrivers = Array.from(driverMap.values())
      setDrivers(formattedDrivers)
      setActiveDeliveriesCount(formattedDrivers.filter(d => d.is_busy).length)

      if (formattedDrivers.length > 0) {
        const busyRider = formattedDrivers.find(d => d.is_busy) || formattedDrivers.find(d => d.is_online) || formattedDrivers[0]
        if (!selectedRider || !formattedDrivers.some(d => d.id === selectedRider.id)) {
          setSelectedRider(busyRider)
        }
      } else {
        setSelectedRider(null)
      }
    } catch (err) {
      console.warn('Error fetching deliveries data:', err)
      setDrivers([])
      setSelectedRider(null)
    } finally {
      setLoading(false)
    }
  }, [selectedRider, activeStoreId])

  useEffect(() => {
    fetchFleetAndOrders()

    const supabase = createClient()
    const channel = supabase
      .channel('deliveries-live-radar-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchFleetAndOrders()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => {
        fetchFleetAndOrders()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => {
        fetchFleetAndOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchFleetAndOrders])

  // Handle Single Auto Dispatch
  const handleAutoDispatch = async (orderId: string) => {
    setDispatchingId(orderId)
    try {
      const res = await autoAssignNearestAvailableDriver(orderId)
      if (res.success && res.driver) {
        toast.success(`⚡ Order #${orderId.slice(0, 8)} dispatched to ${res.driver.name}!`, {
          description: `${res.driver.vehicle_type} • ${res.driver.vehicle_number || 'UP 70'}`,
        })
        await fetchFleetAndOrders()
      } else {
        toast.error(res.error || 'Failed to auto-assign rider')
      }
    } catch (err: any) {
      toast.error(err.message || 'Auto-dispatch error')
    } finally {
      setDispatchingId(null)
    }
  }

  // Handle Batch Auto-Dispatch All Pending
  const handleBatchAutoDispatchAll = async () => {
    setIsBatchDispatching(true)
    try {
      const res = await batchAutoDispatchPendingOrders()
      if (res.success) {
        toast.success(`⚡ Batch Auto-Dispatch Complete!`, {
          description: res.message,
        })
        await fetchFleetAndOrders()
      } else {
        toast.error(res.error || 'Batch auto-dispatch failed')
      }
    } catch (err: any) {
      toast.error(err.message || 'Batch dispatch error')
    } finally {
      setIsBatchDispatching(false)
    }
  }

  // Handle Manual Driver Reassignment
  const handleManualReassign = async (orderId: string, driverId: string) => {
    try {
      const res = await reassignOrderDriver(orderId, driverId)
      if (res.success) {
        toast.success(res.message || 'Driver assigned successfully!')
        setReassignModalOrder(null)
        await fetchFleetAndOrders()
      } else {
        toast.error(res.error || 'Failed to assign driver')
      }
    } catch (err: any) {
      toast.error(err.message || 'Reassignment error')
    }
  }

  // Handle Purge Old Delivery Activities
  const handlePurgeActivities = async () => {
    if (!confirm('Are you sure you want to purge all past delivery tracking logs, GPS breadcrumbs, and reset driver active trip statuses?')) {
      return
    }
    setIsPurging(true)
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pizza_active_delivery')
        localStorage.removeItem('pizza_driver_gps')
      }

      const res = await purgeOldDeliveryActivities()
      if (res.success) {
        toast.success(res.message || 'All past delivery activities purged successfully!')
        await fetchFleetAndOrders()
      } else {
        toast.error(res.error || 'Failed to purge delivery activities')
      }
    } catch (err: any) {
      toast.error(err.message || 'Purge error')
    } finally {
      setIsPurging(false)
    }
  }

  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone.includes(searchQuery)

    if (!matchesSearch) return false
    if (filter === 'active') return d.is_busy
    if (filter === 'idle') return d.is_online && !d.is_busy
    if (filter === 'offline') return !d.is_online
    return true
  })

  const onlineDriversCount = drivers.filter(d => d.is_online).length
  const activeRoadCount = drivers.filter(d => d.is_busy).length
  const idleDriversCount = drivers.filter(d => d.is_online && !d.is_busy).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEF2F2] border border-[#FCA5A5] text-[#B91C1C] text-xs font-bold font-mono uppercase mb-1">
            <Radio size={14} className="animate-pulse" /> Live Fleet Operations & Smart Dispatch Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#1C1917]">
            Delivery Management & Live Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C]">
            Interconnected kitchen-to-doorstep dispatch, automated driver routing, and Prayagraj GPS radar.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Auto-Dispatch Engine Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E7E0D8] rounded-xl text-xs font-bold shadow-xs">
            <Zap size={14} className={autoDispatchEnabled ? 'text-amber-500 fill-amber-500' : 'text-[#A8A29E]'} />
            <span>Auto-Dispatch</span>
            <button
              onClick={() => {
                setAutoDispatchEnabled(!autoDispatchEnabled)
                toast.info(`Smart Auto-Dispatch mode set to: ${!autoDispatchEnabled ? 'ENABLED' : 'MANUAL'}`)
              }}
              className={`w-9 h-5 rounded-full transition-colors relative ${autoDispatchEnabled ? 'bg-emerald-600' : 'bg-stone-300'}`}
            >
              <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${autoDispatchEnabled ? 'left-4.5' : 'left-1'}`} />
            </button>
          </div>

          <button
            onClick={() => {
              setLoading(true)
              fetchFleetAndOrders()
            }}
            className="btn btn-outline text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5"
            title="Refresh Fleet Status"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            disabled={isPurging}
            onClick={handlePurgeActivities}
            className="btn btn-outline text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-rose-600 hover:bg-rose-50 hover:border-rose-300 border-[#E7E0D8] disabled:opacity-50"
            title="Purge Old Delivery Activities & Reset Radar"
          >
            {isPurging ? (
              <Loader2 size={14} className="animate-spin text-rose-600" />
            ) : (
              <Trash2 size={14} className="text-rose-600" />
            )}
            <span>Purge Logs</span>
          </button>

          <Link
            href="/admin/drivers"
            className="btn btn-primary text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={15} />
            <span>Onboard Rider</span>
          </Link>

          <Link
            href="/partner/deliveries"
            target="_blank"
            className="btn btn-outline text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
          >
            <Bike size={15} />
            <span>Rider App</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-[#78716C] tracking-wider block">
            Active on Road
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#1C1917]">
            {activeRoadCount} <span className="text-sm font-normal text-[#78716C]">/ {drivers.length}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {onlineDriversCount} Online ({idleDriversCount} Idle)
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-[#78716C] tracking-wider block">
            Pending Dispatch
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#1C1917]">
            {unassignedOrders.length}
          </div>
          <span className="text-[11px] text-[#B91C1C] font-bold flex items-center gap-1">
            <Zap size={12} /> Auto-Queue Active
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-[#78716C] tracking-wider block">
            Avg Delivery Time
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#1C1917]">
            {avgDeliveryTimeMinutes > 0 ? `${avgDeliveryTimeMinutes}m` : '22m'}
          </div>
          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <ShieldCheck size={12} /> Prayagraj SLA Target: &lt;30m
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-[#78716C] tracking-wider block">
            Delivered Today
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#1C1917]">
            {todayCompletedTrips} <span className="text-sm font-normal text-[#78716C]">orders</span>
          </div>
          <span className="text-[11px] text-[#78716C] font-mono">
            ₹{todayRevenue.toLocaleString()} volume
          </span>
        </div>
      </div>

      {/* Navigation Operating Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E7E0D8] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('radar')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'radar'
              ? 'bg-[#1C1917] text-white shadow-xs'
              : 'bg-white text-[#57534E] hover:bg-[#F4EFEA] border border-[#E7E0D8]'
          }`}
        >
          <Compass size={15} className={activeTab === 'radar' ? 'text-[#B91C1C]' : ''} />
          <span>Fleet Radar & Telemetry</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
            {drivers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('dispatch_queue')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'dispatch_queue'
              ? 'bg-[#1C1917] text-white shadow-xs'
              : 'bg-white text-[#57534E] hover:bg-[#F4EFEA] border border-[#E7E0D8]'
          }`}
        >
          <Zap size={15} className={activeTab === 'dispatch_queue' ? 'text-amber-400' : ''} />
          <span>Dispatch Queue</span>
          {unassignedOrders.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#B91C1C] text-white font-mono animate-pulse">
              {unassignedOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('kitchen_sync')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'kitchen_sync'
              ? 'bg-[#1C1917] text-white shadow-xs'
              : 'bg-white text-[#57534E] hover:bg-[#F4EFEA] border border-[#E7E0D8]'
          }`}
        >
          <UtensilsCrossed size={15} className={activeTab === 'kitchen_sync' ? 'text-[#2563EB]' : ''} />
          <span>Kitchen Sync Board</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-stone-200 text-[#1C1917] font-mono">
            {kitchenOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('active_trips')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'active_trips'
              ? 'bg-[#1C1917] text-white shadow-xs'
              : 'bg-white text-[#57534E] hover:bg-[#F4EFEA] border border-[#E7E0D8]'
          }`}
        >
          <Bike size={15} className={activeTab === 'active_trips' ? 'text-emerald-400' : ''} />
          <span>Live Active Trips</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono">
            {activeTrips.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Fleet Radar & Telemetry */}
      {activeTab === 'radar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Live Radar Map */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-[#E7E0D8] shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#1C1917] flex items-center gap-2">
                    <Compass size={18} className="text-[#B91C1C]" />
                    <span>Prayagraj Fleet GPS Radar</span>
                  </h3>
                  <p className="text-xs text-[#78716C]">
                    Hub: {STORE_DETAILS.address}
                  </p>
                </div>

                {selectedRider && (
                  <div className="flex items-center gap-2 bg-[#FBF9F5] px-3 py-1 rounded-xl border border-[#E7E0D8] text-xs">
                    <span className="font-bold text-[#1C1917]">{selectedRider.name}</span>
                    <span className={`w-2 h-2 rounded-full ${selectedRider.is_busy ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                    <span className="text-[#78716C] font-mono">{selectedRider.vehicle_number}</span>
                  </div>
                )}
              </div>

              {/* Leaflet Map */}
              <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-[#E7E0D8] shadow-inner relative">
                <LiveDeliveryMap
                  driverLocation={{
                    lat: selectedRider?.current_lat || STORE_LOCATION.lat,
                    lng: selectedRider?.current_lng || STORE_LOCATION.lng,
                    speed: selectedRider?.is_busy ? 28 : 0,
                    heading: 90,
                    updatedAt: Date.now(),
                  }}
                  destinationLocation={selectedRider?.destinationCoords || { lat: 25.4528, lng: 81.8346 }}
                  destinationAddress={selectedRider?.destination || 'Civil Lines, Prayagraj'}
                  driverName={selectedRider?.name || 'Allapur Fleet'}
                  status={selectedRider?.is_busy ? 'heading_to_customer' : 'ready'}
                  etaMinutes={selectedRider?.is_busy ? 12 : 0}
                  distanceKm={selectedRider?.is_busy ? 2.4 : 0}
                />
              </div>

              {/* Map Footer Telemetry */}
              <div className="flex items-center justify-between text-xs text-[#78716C] pt-1 flex-wrap gap-2">
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Allapur Hub Online
                  </span>
                  <span>•</span>
                  <span>Lat: {STORE_LOCATION.lat.toFixed(4)}, Lng: {STORE_LOCATION.lng.toFixed(4)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px]">Live 3.5s Realtime Sync</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Active Fleet Directory */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-[#E7E0D8] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-base text-[#1C1917]">
                  Fleet Directory ({drivers.length})
                </h3>

                <div className="flex items-center gap-1 bg-[#FBF9F5] p-1 rounded-xl border border-[#E7E0D8]">
                  {(['all', 'idle', 'active', 'offline'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        filter === f
                          ? 'bg-[#1C1917] text-white'
                          : 'text-[#78716C] hover:text-[#1C1917]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
                <input
                  type="text"
                  placeholder="Search by rider name, plate or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-2 bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl text-xs focus:ring-1 focus:ring-[#B91C1C] focus:outline-none"
                />
              </div>

              {/* Driver List */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredDrivers.length === 0 ? (
                  <div className="text-center py-10 text-xs text-[#78716C]">
                    No drivers match filter.
                  </div>
                ) : (
                  filteredDrivers.map((d) => {
                    const isSelected = selectedRider?.id === d.id
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedRider(d)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? 'bg-[#FEF2F2]/60 border-[#B91C1C] ring-1 ring-[#B91C1C]'
                            : 'bg-white border-[#E7E0D8] hover:border-[#B91C1C]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#FBF9F5] border border-[#E7E0D8] flex items-center justify-center text-sm">
                              🛵
                            </div>
                            <div>
                              <div className="font-bold text-xs text-[#1C1917] flex items-center gap-1.5">
                                <span>{d.name}</span>
                                {d.is_busy ? (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold">
                                    ON TRIP
                                  </span>
                                ) : d.is_online ? (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">
                                    IDLE
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-stone-200 text-stone-700 rounded">
                                    OFFLINE
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#78716C] font-mono">
                                {d.vehicle_type} • {d.vehicle_number || 'UP 70'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            {d.phone && (
                              <a
                                href={`tel:${d.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-emerald-700 hover:text-emerald-800 p-1.5 bg-emerald-50 rounded-lg inline-flex"
                                title="Call Driver"
                              >
                                <Phone size={13} />
                              </a>
                            )}
                          </div>
                        </div>

                        {d.is_busy && d.activeOrderId && (
                          <div className="text-[11px] bg-white border border-[#E7E0D8] rounded-xl p-2 flex items-center justify-between text-[#1C1917]">
                            <span className="font-mono font-bold text-[#B91C1C]">
                              #{d.activeOrderId}
                            </span>
                            <span className="text-[#78716C] truncate max-w-[140px]">
                              {d.destination || 'Civil Lines'}
                            </span>
                            <span className="font-mono text-emerald-700 font-bold">
                              {d.eta || '12m'}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Dispatch Queue & Unassigned Orders */}
      {activeTab === 'dispatch_queue' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1C1917] flex items-center gap-2">
                  <Zap size={18} className="text-amber-500" />
                  <span>Unassigned Orders & Auto-Dispatch Queue</span>
                </h3>
                <p className="text-xs text-[#78716C]">
                  Orders awaiting delivery partner dispatch. The engine automatically routes to the closest idle rider.
                </p>
              </div>

              {unassignedOrders.length > 0 && (
                <button
                  disabled={isBatchDispatching}
                  onClick={handleBatchAutoDispatchAll}
                  className="btn btn-primary text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs"
                >
                  {isBatchDispatching ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Zap size={15} />
                  )}
                  <span>Auto-Dispatch All ({unassignedOrders.length})</span>
                </button>
              )}
            </div>

            {unassignedOrders.length === 0 ? (
              <div className="text-center py-16 bg-[#FBF9F5] rounded-2xl border border-dashed border-[#E7E0D8] space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                <h4 className="font-bold text-sm text-[#1C1917]">All Orders Dispatched</h4>
                <p className="text-xs text-[#78716C]">
                  There are no pending orders waiting in the dispatch queue.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unassignedOrders.map((ord) => {
                  const addr = ord.address_json || {}
                  const itemsList = ord.order_items || []
                  const summaryStr = itemsList
                    .map((i: any) => `${i.quantity}x ${i.products?.name || 'Pizza'}`)
                    .join(', ') || 'Wood-Fired Pizza'
                  const isDispatching = dispatchingId === ord.id

                  return (
                    <div
                      key={ord.id}
                      className="p-5 rounded-2xl bg-[#FBF9F5] border border-[#E7E0D8] space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-2">
                        <span className="font-mono font-bold text-sm text-[#B91C1C]">
                          #{String(ord.id).slice(-6).toUpperCase()}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                          {ord.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-[#1C1917]">
                        <div className="font-bold flex items-center justify-between">
                          <span>{addr.name || 'Customer'}</span>
                          <span className="text-emerald-700 font-mono">₹{ord.total}</span>
                        </div>
                        <p className="text-[#78716C] text-[11px] line-clamp-1">
                          {[addr.line1, addr.city].filter(Boolean).join(', ') || 'Prayagraj'}
                        </p>
                        <p className="text-[#57534E] text-[11px] font-medium pt-1">
                          {summaryStr}
                        </p>
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        <button
                          disabled={isDispatching}
                          onClick={() => handleAutoDispatch(ord.id)}
                          className="flex-1 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                          <Zap size={13} />
                          <span>{isDispatching ? 'Assigning...' : 'Auto-Dispatch'}</span>
                        </button>

                        <button
                          onClick={() => setReassignModalOrder(ord.id)}
                          className="px-3 py-2 bg-white hover:bg-[#F4EFEA] border border-[#E7E0D8] text-[#1C1917] rounded-xl text-xs font-semibold"
                        >
                          Manual
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Kitchen Sync Board */}
      {activeTab === 'kitchen_sync' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1C1917] flex items-center gap-2">
                  <UtensilsCrossed size={18} className="text-[#2563EB]" />
                  <span>Kitchen Display (KDS) Synchronization</span>
                </h3>
                <p className="text-xs text-[#78716C]">
                  Live operational stage mirror between oven baking milestones and rider dispatch handoffs.
                </p>
              </div>

              <Link
                href="/admin/kitchen"
                className="btn btn-outline text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5"
              >
                <ExternalLink size={14} />
                <span>Open Full KDS Display</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kitchenOrders.map((kOrd) => {
                const stageColor =
                  kOrd.status === 'preparing'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : kOrd.status === 'out_for_delivery'
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'

                return (
                  <div
                    key={kOrd.id}
                    className="p-5 rounded-2xl bg-white border border-[#E7E0D8] space-y-3 shadow-xs hover:border-[#B91C1C]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-2">
                      <span className="font-mono font-bold text-sm text-[#1C1917]">
                        #{kOrd.id.slice(-6).toUpperCase()}
                      </span>
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border ${stageColor}`}>
                        {kOrd.status === 'preparing' ? 'IN OVEN' : kOrd.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-[#1C1917] flex items-center justify-between">
                        <span>{kOrd.customer}</span>
                        <span className="text-emerald-700 font-mono">₹{kOrd.amount}</span>
                      </div>
                      <p className="text-[#78716C] text-[11px] line-clamp-1">{kOrd.address}</p>
                      <p className="text-[#57534E] text-[11px] pt-1 font-medium">{kOrd.items}</p>
                    </div>

                    <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl p-2.5 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bike size={14} className="text-[#B91C1C]" />
                        <span className="font-bold text-[11px] text-[#1C1917]">
                          {kOrd.driverName || '⚠️ Unassigned Rider'}
                        </span>
                      </div>
                      {kOrd.otpCode && (
                        <span className="font-mono text-[10px] font-bold text-[#B91C1C] bg-rose-50 px-1.5 py-0.5 rounded">
                          OTP: {kOrd.otpCode}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Live Active Trips */}
      {activeTab === 'active_trips' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-[#1C1917] flex items-center gap-2">
                <Bike size={18} className="text-emerald-600" />
                <span>Active Road Trips & SLA Telemetry</span>
              </h3>
              <p className="text-xs text-[#78716C]">
                Real-time tracking of riders currently en route to customer doorstep across Prayagraj.
              </p>
            </div>

            {activeTrips.length === 0 ? (
              <div className="text-center py-16 bg-[#FBF9F5] rounded-2xl border border-dashed border-[#E7E0D8] space-y-2">
                <Bike size={32} className="mx-auto text-[#78716C]" />
                <h4 className="font-bold text-sm text-[#1C1917]">No Trips Currently on Road</h4>
                <p className="text-xs text-[#78716C]">
                  All assigned orders have been completed or are awaiting kitchen pickup.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTrips.map((trip) => {
                  const addr = trip.address_json || {}
                  const dName = addr.driverName || 'Assigned Rider'
                  const dPhone = addr.driverPhone || ''
                  const otp = addr.deliveryOtp || '1234'

                  return (
                    <div
                      key={trip.id}
                      className="p-5 rounded-2xl bg-white border border-[#E7E0D8] space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-2">
                        <span className="font-mono font-bold text-sm text-[#B91C1C]">
                          #{trip.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                          OUT FOR DELIVERY
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-[#1C1917] flex items-center justify-between">
                          <span>{addr.name || 'Customer'}</span>
                          {addr.phone && (
                            <a href={`tel:${addr.phone}`} className="text-emerald-700 font-mono hover:underline">
                              {addr.phone}
                            </a>
                          )}
                        </div>
                        <p className="text-[#78716C] text-[11px] line-clamp-1">{addr.line1 || 'Prayagraj'}</p>
                      </div>

                      <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1C1917] flex items-center gap-1.5">
                            <Bike size={13} className="text-[#B91C1C]" />
                            {dName}
                          </span>
                          <span className="font-mono font-bold text-[#B91C1C] bg-[#FEF2F2] px-2 py-0.5 rounded border border-[#FECACA]">
                            OTP: {otp}
                          </span>
                        </div>

                        {dPhone && (
                          <div className="flex items-center justify-between text-[11px] text-[#78716C] font-mono">
                            <span>Phone: {dPhone}</span>
                            <a href={`tel:${dPhone}`} className="text-emerald-700 font-bold hover:underline">
                              Call Rider
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => setReassignModalOrder(trip.id)}
                          className="text-xs font-bold text-[#2563EB] hover:underline"
                        >
                          Reassign Rider
                        </button>

                        <Link
                          href={`/track?orderId=${trip.id}`}
                          target="_blank"
                          className="btn btn-outline text-xs px-3 py-1.5 rounded-xl flex items-center gap-1"
                        >
                          <ExternalLink size={12} />
                          <span>Track GPS</span>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Driver Reassign Modal */}
      {reassignModalOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8]">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1C1917]">Assign Delivery Partner</h3>
                <p className="text-xs text-[#78716C]">Order #{reassignModalOrder.slice(-6).toUpperCase()}</p>
              </div>
              <button
                onClick={() => setReassignModalOrder(null)}
                className="text-[#A8A29E] hover:text-[#1C1917] font-bold text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {drivers.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#78716C]">
                  No registered drivers found in fleet.
                </div>
              ) : (
                drivers.map((drv) => (
                  <div
                    key={drv.id}
                    className="p-3 rounded-2xl border border-[#E7E0D8] hover:border-[#B91C1C] flex items-center justify-between gap-3 transition-colors bg-[#FBF9F5]"
                  >
                    <div>
                      <div className="font-bold text-xs text-[#1C1917] flex items-center gap-1.5">
                        <UserCheck size={13} className="text-[#B91C1C]" />
                        <span>{drv.name}</span>
                        {drv.is_busy && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-mono font-bold">
                            Busy
                          </span>
                        )}
                        {!drv.is_online && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-stone-200 text-stone-700 rounded font-mono">
                            Offline
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#78716C] font-mono">
                        {drv.vehicle_type} • {drv.vehicle_number || drv.phone}
                      </div>
                    </div>

                    <button
                      onClick={() => handleManualReassign(reassignModalOrder, drv.id)}
                      className="btn btn-primary text-xs px-3 py-1.5 rounded-xl shadow-xs"
                    >
                      Assign
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setReassignModalOrder(null)}
                className="btn btn-outline text-xs px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
