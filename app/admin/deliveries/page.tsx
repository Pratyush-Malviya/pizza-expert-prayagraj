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
      setDeliveries([])
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E7E0D8]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#B91C1C] rounded-xl flex items-center justify-center text-white shadow-xs">
            <Truck size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#1C1917]">Delivery Dispatch & Driver Management</h1>
            <p className="text-xs text-[#57534E]">Track active delivery partners and assign orders</p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#E7E0D8] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#57534E] font-medium block">Active Drivers Online</span>
            <span className="text-2xl font-bold font-mono text-[#15803D]">
              {drivers.filter((d) => d.is_online).length} / {drivers.length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-[#15803D] flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E7E0D8] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#57534E] font-medium block">Deliveries In Progress</span>
            <span className="text-2xl font-bold font-mono text-[#2563EB]">
              {deliveries.filter((d) => d.status !== 'delivered').length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
            <Navigation size={20} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E7E0D8] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#57534E] font-medium block">Unassigned Orders</span>
            <span className="text-2xl font-bold font-mono text-[#D97706]">{unassignedOrders.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#D97706] flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E7E0D8] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#57534E] font-medium block">Completed Today</span>
            <span className="text-2xl font-bold font-mono text-[#9333EA]">
              {deliveries.filter((d) => d.status === 'delivered').length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FAF5FF] text-[#9333EA] flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Main Grid: Drivers & Active Deliveries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drivers List */}
        <div className="p-5 rounded-xl bg-white border border-[#E7E0D8] shadow-xs space-y-4">
          <h2 className="font-bold text-base font-serif text-[#1C1917] flex items-center gap-2">
            <UserCheck size={18} className="text-[#B91C1C]" /> Delivery Partners
          </h2>

          <div className="space-y-3">
            {drivers.map((drv) => (
              <div key={drv.id} className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E7E0D8] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 font-bold text-sm text-[#1C1917]">
                    <span>{drv.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${drv.is_online ? 'bg-[#F0FDF4] text-[#15803D] border border-[#15803D]/20' : 'bg-[#F4EFEA] text-[#A8A29E] border border-[#E7E0D8]'}`}>
                      {drv.is_online ? (drv.is_busy ? 'ON DELIVERY' : 'ONLINE') : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="text-xs text-[#57534E] mt-1">
                    {drv.phone} • {drv.vehicle_type} ({drv.vehicle_number || 'N/A'})
                  </div>
                </div>

                <div className="text-right">
                  {drv.current_lat ? (
                    <span className="text-[11px] text-[#2563EB] font-mono flex items-center gap-1">
                      <MapPin size={12} /> GPS Active
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#A8A29E]">No Location</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deliveries & Dispatch */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-[#E7E0D8] shadow-xs space-y-4">
          <h2 className="font-bold text-base font-serif text-[#1C1917] flex items-center gap-2">
            <Navigation size={18} className="text-[#2563EB]" /> Active Deliveries Ledger
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#57534E]">
              <thead className="bg-[#FBF9F5] text-[#1C1917] font-bold uppercase text-[10px] tracking-wider border-b border-[#E7E0D8]">
                <tr>
                  <th className="p-3 rounded-l-md">Order ID</th>
                  <th className="p-3">Assigned Driver</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">OTP Verification</th>
                  <th className="p-3 rounded-r-md">Destination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D8]">
                {deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#A8A29E] text-xs font-medium">
                      No active deliveries in transit
                    </td>
                  </tr>
                ) : (
                  deliveries.map((del) => (
                    <tr key={del.id} className="hover:bg-[#FBF9F5] transition-all text-[#1C1917]">
                      <td className="p-3 font-mono font-bold text-[#B91C1C]">#{del.order_id.slice(-6).toUpperCase()}</td>
                      <td className="p-3 font-semibold text-[#1C1917]">{del.driver?.name || 'Unassigned'}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                          {del.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[#15803D] font-bold">{del.otp_code || 'N/A'}</td>
                      <td className="p-3 text-xs text-[#57534E] truncate max-w-[200px]">
                        {del.order?.address_json?.line1 || 'Prayagraj'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
