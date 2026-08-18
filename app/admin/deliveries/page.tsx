'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  Bike, MapPin, Compass, Phone, ShieldCheck, Clock,
  CheckCircle2, AlertCircle, Search, ExternalLink, Plus, RefreshCw, UserCheck
} from 'lucide-react'
import type { DeliveryPartner } from '@/lib/tracking/types'
import { STORE_LOCATION } from '@/lib/tracking/types'

const LiveDeliveryMap = dynamic(() => import('@/components/tracking/LiveDeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] rounded-2xl bg-[#FBF9F5] border border-[#E7E0D8] flex items-center justify-center text-xs font-mono text-[#78716C]">
      Loading Prayagraj Fleet GPS Map...
    </div>
  ),
})

const SAMPLE_DRIVERS: (DeliveryPartner & { activeOrder?: string; destination?: string; eta?: string })[] = [
  {
    id: 'DP-01',
    name: 'Rahul Sharma',
    phone: '+91 98765 43210',
    vehicle_type: 'Honda Activa 6G',
    vehicle_number: 'UP 70 AB 1234',
    rating: 4.9,
    total_deliveries: 1420,
    is_online: true,
    is_busy: true,
    activeOrder: 'ORD-982143',
    destination: 'Civil Lines, Prayagraj',
    eta: '11 mins',
    current_lat: 25.4410,
    current_lng: 81.8590,
  },
  {
    id: 'DP-02',
    name: 'Amit Verma',
    phone: '+91 98765 11223',
    vehicle_type: 'TVS Jupiter',
    vehicle_number: 'UP 70 CD 5678',
    rating: 4.8,
    total_deliveries: 980,
    is_online: true,
    is_busy: true,
    activeOrder: 'ORD-982188',
    destination: 'George Town, Prayagraj',
    eta: '6 mins',
    current_lat: 25.4390,
    current_lng: 81.8620,
  },
  {
    id: 'DP-03',
    name: 'Vikas Maurya',
    phone: '+91 98765 99887',
    vehicle_type: 'Hero Splendor+',
    vehicle_number: 'UP 70 EF 9012',
    rating: 4.9,
    total_deliveries: 1850,
    is_online: true,
    is_busy: false,
    current_lat: 25.4358,
    current_lng: 81.8682,
  },
  {
    id: 'DP-04',
    name: 'Suresh Yadav',
    phone: '+91 98765 33445',
    vehicle_type: 'Bajaj Pulsar 150',
    vehicle_number: 'UP 70 GH 3456',
    rating: 4.7,
    total_deliveries: 620,
    is_online: false,
    is_busy: false,
  },
]

export default function AdminDeliveriesPage() {
  const [drivers, setDrivers] = useState(SAMPLE_DRIVERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'idle' | 'offline'>('all')

  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase())
    if (filter === 'active') return matchesSearch && d.is_online && d.is_busy
    if (filter === 'idle') return matchesSearch && d.is_online && !d.is_busy
    if (filter === 'offline') return matchesSearch && !d.is_online
    return matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1C1917]">
            Delivery Fleet & Real-Time Tracking
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C]">
            Monitor active delivery partners, live GPS locations across Prayagraj, and delivery SLAs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/drivers"
            className="btn btn-primary text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={15} />
            <span>Onboard Delivery Person</span>
          </Link>

          <Link
            href="/partner/join"
            target="_blank"
            className="btn btn-outline text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
          >
            <ExternalLink size={14} />
            <span>Rider Application Page</span>
          </Link>

          <Link
            href="/partner/deliveries"
            target="_blank"
            className="btn btn-outline text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
          >
            <Bike size={15} />
            <span>Open Rider App</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-[#78716C]">Active on Road</span>
          <div className="text-2xl font-bold font-mono text-[#1C1917]">2 / 4</div>
          <span className="text-[11px] text-emerald-600 font-medium">● 3 Online Total</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-[#78716C]">Avg Delivery Time</span>
          <div className="text-2xl font-bold font-mono text-[#B91C1C]">21.4 Mins</div>
          <span className="text-[11px] text-emerald-600 font-medium">✓ 8.6m faster than 30m SLA</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-[#78716C]">On-Time Delivery Rate</span>
          <div className="text-2xl font-bold font-mono text-emerald-700">96.8%</div>
          <span className="text-[11px] text-[#78716C]">Past 7 days benchmark</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-[#78716C]">Today&apos;s Completed Trips</span>
          <div className="text-2xl font-bold font-mono text-[#1C1917]">38 Trips</div>
          <span className="text-[11px] text-[#78716C]">₹18,920 total delivered</span>
        </div>
      </div>

      {/* Fleet Live GPS Command Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-serif font-bold text-[#1C1917] flex items-center gap-2">
            <Compass size={18} className="text-[#B91C1C]" />
            <span>Prayagraj Live Fleet GPS Radar</span>
          </h2>
          <span className="text-xs font-mono text-emerald-700 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Live Supabase Realtime Active
          </span>
        </div>

        <LiveDeliveryMap
          driverLocation={{ lat: 25.4410, lng: 81.8590, updatedAt: Date.now() }}
          destinationLocation={{ lat: 25.4528, lng: 81.8346 }}
          destinationAddress="Civil Lines, Prayagraj"
          driverName="Rahul Sharma (Active)"
          etaMinutes={11}
          distanceKm={2.4}
        />
      </div>

      {/* Delivery Partners Table */}
      <div className="bg-white rounded-2xl border border-[#E7E0D8] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E7E0D8] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[#1C1917] text-sm sm:text-base">
              Rider Fleet Roster ({filteredDrivers.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center bg-[#FBF9F5] p-1 rounded-xl border border-[#E7E0D8] text-xs font-semibold">
              {(['all', 'active', 'idle', 'offline'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                    filter === t ? 'bg-white text-[#1C1917] shadow-xs font-bold' : 'text-[#78716C] hover:text-[#1C1917]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]" />
              <input
                type="text"
                placeholder="Search rider name / vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 pr-3 py-1.5 text-xs bg-[#FBF9F5] w-48 sm:w-60"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FBF9F5] border-b border-[#E7E0D8] text-[#78716C] uppercase font-mono font-bold text-[10px]">
              <tr>
                <th className="px-5 py-3">Rider Name & Vehicle</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Active Order / Destination</th>
                <th className="px-5 py-3">Rating & Trips</th>
                <th className="px-5 py-3 text-right">Live Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0D8]">
              {filteredDrivers.map((d) => (
                <tr key={d.id} className="hover:bg-[#FDFBF7] transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-[#1C1917] text-sm">{d.name}</div>
                    <div className="text-[11px] font-mono text-[#78716C]">
                      {d.vehicle_type} • {d.vehicle_number}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {d.is_busy ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 w-max">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                        Delivering (En Route)
                      </span>
                    ) : d.is_online ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 w-max">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Idle (Ready at Kitchen)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-700 border border-stone-300 w-max block">
                        Offline
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {d.activeOrder ? (
                      <div>
                        <span className="font-mono font-bold text-[#B91C1C] block">
                          #{d.activeOrder}
                        </span>
                        <span className="text-[11px] text-[#57534E]">
                          {d.destination} (ETA: {d.eta})
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#A8A29E] italic">No active order</span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-bold text-[#1C1917] font-mono flex items-center gap-1">
                      <span>⭐ {d.rating}</span>
                    </div>
                    <div className="text-[11px] text-[#78716C]">
                      {d.total_deliveries.toLocaleString()} completed
                    </div>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`tel:${d.phone}`}
                        title="Call Rider"
                        className="p-2 bg-[#FBF9F5] hover:bg-[#E7E0D8] rounded-lg text-[#1C1917] transition-colors"
                      >
                        <Phone size={14} />
                      </a>

                      {d.activeOrder && (
                        <Link
                          href={`/track?orderId=${d.activeOrder}`}
                          className="px-3 py-1.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs"
                        >
                          <Compass size={12} />
                          <span>Track GPS</span>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
