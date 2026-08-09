'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Driver, Delivery, Order } from '@/types'
import {
  Truck, UserCheck, MapPin, Clock, CheckCircle2,
  Navigation, UserX, AlertTriangle, ShieldCheck
} from 'lucide-react'
import { syncOrderStatus } from '@/lib/utils/orderSync'
export default function DeliveriesAdminPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [unassignedOrders, setUnassignedOrders] = useState<Order[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadDeliveryData = async () => {
    setLoading(true)
    const { data: driverData } = await supabase.from('drivers').select('*')
    const { data: unassignedData } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'preparing')

    const { data: deliveryData } = await supabase
      .from('deliveries')
      .select('*, driver:drivers(*), order:orders(*)')
      .order('created_at', { ascending: false })

    if (driverData) setDrivers(driverData)
    if (unassignedData) setUnassignedOrders(unassignedData as any)
    if (deliveryData) setDeliveries(deliveryData as any)

    // Fallback Mock Data if Supabase local tables are empty
    if (!driverData || driverData.length === 0) {
      setDrivers([
        { id: 'drv-1', name: 'Raj Kumar', phone: '+91 98765 43210', vehicle_type: 'Bike', vehicle_number: 'UP70 AB 1234', is_online: true, is_busy: true, current_lat: 25.4358, current_lng: 81.8463, last_location_update: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 'drv-2', name: 'Aman Verma', phone: '+91 91234 56789', vehicle_type: 'Scooter', vehicle_number: 'UP70 XY 9876', is_online: true, is_busy: false, current_lat: 25.4500, current_lng: 81.8300, last_location_update: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 'drv-3', name: 'Suresh Patel', phone: '+91 99887 76655', vehicle_type: 'Bike', vehicle_number: 'UP70 CD 5555', is_online: false, is_busy: false, current_lat: null, current_lng: null, last_location_update: null, created_at: new Date().toISOString() },
      ])
    }

    if (!deliveryData || deliveryData.length === 0) {
      setDeliveries([
        {
          id: 'del-101',
          order_id: 'ord-101',
          driver_id: 'drv-1',
          status: 'picked_up',
          pickup_time: new Date(Date.now() - 10 * 60000).toISOString(),
          delivered_time: null,
          otp_code: '4829',
          proof_photo: null,
          notes: 'Customer requested call upon arrival',
          created_at: new Date().toISOString(),
          driver: { name: 'Raj Kumar', phone: '+91 98765 43210', vehicle_type: 'Bike' } as any,
          order: { total: 500, address_json: { line1: 'Flat 402, Civil Lines' } } as any,
        },
      ])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadDeliveryData()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadDeliveryData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const assignDriverToOrder = async (orderId: string, driverId: string) => {
    const { error } = await supabase.from('deliveries').insert({
      order_id: orderId,
      driver_id: driverId,
      status: 'assigned',
    })

    if (!error) {
      await syncOrderStatus(orderId, 'out_for_delivery')
      await supabase.from('drivers').update({ is_busy: true }).eq('id', driverId)
      loadDeliveryData()
    }
  }

  return (
    <div className="p-6 bg-[#09090B] min-h-screen text-white space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#27272A]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#B91C1C] rounded-lg flex items-center justify-center text-white">
            <Truck size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif">Delivery Dispatch & Driver Management</h1>
            <p className="text-xs text-[#A8A29E]">Track active delivery partners and assign orders</p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#A8A29E] font-medium block">Active Drivers Online</span>
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {drivers.filter((d) => d.is_online).length} / {drivers.length}
            </span>
          </div>
          <UserCheck size={24} className="text-emerald-400" />
        </div>

        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#A8A29E] font-medium block">Deliveries In Progress</span>
            <span className="text-2xl font-bold font-mono text-blue-400">
              {deliveries.filter((d) => d.status !== 'delivered').length}
            </span>
          </div>
          <Navigation size={24} className="text-blue-400" />
        </div>

        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#A8A29E] font-medium block">Unassigned Orders</span>
            <span className="text-2xl font-bold font-mono text-amber-400">{unassignedOrders.length}</span>
          </div>
          <AlertTriangle size={24} className="text-amber-400" />
        </div>

        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-between">
          <div>
            <span className="text-xs text-[#A8A29E] font-medium block">Completed Today</span>
            <span className="text-2xl font-bold font-mono text-purple-400">
              {deliveries.filter((d) => d.status === 'delivered').length}
            </span>
          </div>
          <CheckCircle2 size={24} className="text-purple-400" />
        </div>
      </div>

      {/* Main Grid: Drivers & Active Deliveries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drivers List */}
        <div className="p-5 rounded-xl bg-[#18181B] border border-[#27272A] space-y-4">
          <h2 className="font-bold text-base font-serif flex items-center gap-2">
            <UserCheck size={18} className="text-[#B91C1C]" /> Delivery Partners
          </h2>

          <div className="space-y-3">
            {drivers.map((drv) => (
              <div key={drv.id} className="p-3.5 rounded-lg bg-[#27272A]/50 border border-[#3F3F46] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span>{drv.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${drv.is_online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                      {drv.is_online ? (drv.is_busy ? 'ON DELIVERY' : 'ONLINE') : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="text-xs text-[#A8A29E] mt-1">
                    {drv.phone} • {drv.vehicle_type} ({drv.vehicle_number || 'N/A'})
                  </div>
                </div>

                <div className="text-right">
                  {drv.current_lat ? (
                    <span className="text-[11px] text-blue-400 font-mono flex items-center gap-1">
                      <MapPin size={12} /> GPS Active
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-500">No Location</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deliveries & Dispatch */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#18181B] border border-[#27272A] space-y-4">
          <h2 className="font-bold text-base font-serif flex items-center gap-2">
            <Navigation size={18} className="text-blue-400" /> Active Deliveries Ledger
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#A8A29E]">
              <thead className="bg-[#27272A] text-white font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-md">Order ID</th>
                  <th className="p-3">Assigned Driver</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">OTP Verification</th>
                  <th className="p-3 rounded-r-md">Destination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {deliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-[#27272A]/30 transition-all text-white">
                    <td className="p-3 font-mono font-bold text-[#F43F5E]">#{del.order_id.slice(-6).toUpperCase()}</td>
                    <td className="p-3 font-semibold">{del.driver?.name || 'Unassigned'}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {del.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-emerald-400 font-bold">{del.otp_code || 'N/A'}</td>
                    <td className="p-3 text-xs text-[#A8A29E] truncate max-w-[200px]">
                      {del.order?.address_json?.line1 || 'Prayagraj'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
