'use client'

import { useState, useEffect } from 'react'
import {
  Flame, Plus, Edit2, Trash2, ArrowUp, ArrowDown,
  Eye, Save, X, Upload, Image as ImageIcon, Zap, Clock, Copy, ArrowRight, Check, RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { useSettingsStore, CarouselOffer } from '@/lib/store/useSettingsStore'
import Image from 'next/image'

export default function AdminOffersPage() {
  const store = useSettingsStore()
  const [mounted, setMounted] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState<CarouselOffer | null>(null)
  const [previewOffer, setPreviewOffer] = useState<CarouselOffer | null>(null)

  // Form State for Add / Edit Modal
  const [formData, setFormData] = useState<Omit<CarouselOffer, 'id'>>({
    badge: 'FLASH DEAL ⚡',
    badgeColor: 'orange',
    title: '',
    subtitle: '',
    code: '',
    discount: '',
    expiryText: '',
    imageUrl: '',
    href: '/menu',
    active: true,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const offers = store.carouselOffers || []

  const handleOpenAddModal = () => {
    setEditingOffer(null)
    setFormData({
      badge: 'FLASH DEAL ⚡',
      badgeColor: 'orange',
      title: '',
      subtitle: '',
      code: '',
      discount: '20% OFF',
      expiryText: 'Valid today only',
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
      href: '/menu',
      active: true,
    })
    setModalOpen(true)
  }

  const handleOpenEditModal = (offer: CarouselOffer) => {
    setEditingOffer(offer)
    setFormData({
      badge: offer.badge,
      badgeColor: offer.badgeColor || 'orange',
      title: offer.title,
      subtitle: offer.subtitle,
      code: offer.code || '',
      discount: offer.discount,
      expiryText: offer.expiryText,
      imageUrl: offer.imageUrl,
      href: offer.href,
      active: offer.active ?? true,
    })
    setModalOpen(true)
  }

  const handleSaveOffer = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.subtitle || !formData.discount) {
      toast.error('Please fill in required fields (Title, Subtitle, Discount)')
      return
    }

    if (editingOffer) {
      store.updateCarouselOffer(editingOffer.id, formData)
      toast.success('Offer slide updated successfully!')
    } else {
      store.addCarouselOffer(formData)
      toast.success('New offer slide created successfully!')
    }

    setModalOpen(false)
  }

  const handleDeleteOffer = (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the offer "${title}"?`)) return
    store.deleteCarouselOffer(id)
    toast.success('Offer slide deleted!')
    if (previewOffer?.id === id) setPreviewOffer(null)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newOffers = [...offers]
    const temp = newOffers[index]
    newOffers[index] = newOffers[index - 1]
    newOffers[index - 1] = temp
    store.reorderCarouselOffers(newOffers)
    toast.success('Slide reordered')
  }

  const handleMoveDown = (index: number) => {
    if (index === offers.length - 1) return
    const newOffers = [...offers]
    const temp = newOffers[index]
    newOffers[index] = newOffers[index + 1]
    newOffers[index + 1] = temp
    store.reorderCarouselOffers(newOffers)
    toast.success('Slide reordered')
  }

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image file must be under 2MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setFormData({ ...formData, imageUrl: reader.result as string })
      toast.success('Image uploaded successfully!')
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1C1917] flex items-center gap-2.5">
            <Flame className="text-[#FF3B00]" size={28} />
            <span>Flash Offer Carousel Manager</span>
          </h1>
          <p className="text-[#57534E] text-xs sm:text-sm">
            Create, edit, reorder, enable/disable, and preview auto-sliding promo banners on the homepage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (confirm('Reset carousel to factory default offers?')) {
                localStorage.removeItem('pizza-expert-settings')
                window.location.reload()
              }
            }}
            className="btn btn-outline text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Reset Defaults
          </button>
          <button
            onClick={handleOpenAddModal}
            className="btn bg-[#FF3B00] hover:bg-[#D63200] text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-[#FF3B00]/20"
          >
            <Plus size={16} /> Add Offer Slide
          </button>
        </div>
      </div>

      {/* Live Preview Card */}
      {previewOffer && (
        <div className="bg-[#0D0D11] border border-white/15 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <span className="text-xs font-mono font-bold text-[#FFC01D] uppercase tracking-wider flex items-center gap-1.5">
              <Eye size={14} /> Live Homepage Carousel Card Preview
            </span>
            <button onClick={() => setPreviewOffer(null)} className="text-zinc-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 items-center bg-[#16161E] border border-white/10 p-6 rounded-2xl">
            <div className="lg:col-span-8 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase bg-[#FF3B00] text-white">
                  <Zap size={13} /> {previewOffer.badge}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold text-[#FFC01D] bg-[#FFC01D]/10 border border-[#FFC01D]/20">
                  <Clock size={12} /> {previewOffer.expiryText}
                </span>
              </div>
              <h3 className="font-heading font-extrabold text-2xl sm:text-3xl text-white uppercase tracking-tight">
                {previewOffer.title}
              </h3>
              <p className="text-zinc-300 text-xs sm:text-sm">{previewOffer.subtitle}</p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {previewOffer.code && (
                  <span className="px-4 py-2 bg-white/10 border border-white/20 rounded-full font-mono text-[#FFC01D] text-xs font-bold">
                    {previewOffer.code}
                  </span>
                )}
                <span className="btn bg-[#FF3B00] text-white text-xs font-black px-5 py-2 rounded-full flex items-center gap-1.5">
                  CLAIM OFFER <ArrowRight size={14} />
                </span>
              </div>
            </div>
            <div className="lg:col-span-4 hidden lg:flex items-center justify-end">
              <div className="w-36 h-36 rounded-xl overflow-hidden border border-white/20 relative shadow-xl">
                <img src={previewOffer.imageUrl} alt={previewOffer.title} className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2 bg-black/80 text-[#FFC01D] text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                  {previewOffer.discount}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offers Table / Manager Grid */}
      <div className="bg-white rounded-xl border border-[#E7E0D8] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E7E0D8] bg-[#FBF9F5] flex items-center justify-between">
          <h2 className="font-serif font-bold text-[#1C1917] text-base">
            Active Slides List ({offers.length})
          </h2>
          <span className="text-xs text-[#57534E]">
            Drag/reorder slides to change sequential order on the homepage
          </span>
        </div>

        <div className="divide-y divide-[#E7E0D8]">
          {offers.length === 0 ? (
            <div className="p-12 text-center text-[#A8A29E] space-y-3">
              <p className="text-sm">No offer slides found in carousel.</p>
              <button onClick={handleOpenAddModal} className="btn btn-primary text-xs">
                Create First Offer Slide
              </button>
            </div>
          ) : (
            offers.map((offer, index) => (
              <div
                key={offer.id}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                  offer.active === false ? 'bg-gray-50 opacity-60' : 'hover:bg-[#FBF9F5]'
                }`}
              >
                {/* Thumbnail & Main Content */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#E7E0D8] bg-gray-100 shrink-0">
                    <img
                      src={offer.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200'}
                      alt={offer.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-bold text-[10px] uppercase">
                        {offer.badge}
                      </span>
                      {offer.code && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-mono text-[10px] font-bold">
                          CODE: {offer.code}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                        {offer.discount}
                      </span>
                      <span className="text-[10px] text-[#A8A29E] font-medium">
                        {offer.expiryText}
                      </span>
                    </div>

                    <h3 className="font-bold text-[#1C1917] text-sm leading-tight">
                      {offer.title}
                    </h3>
                    <p className="text-xs text-[#57534E] line-clamp-1">{offer.subtitle}</p>
                  </div>
                </div>

                {/* Controls & Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-[#E7E0D8] w-full sm:w-auto justify-between sm:justify-end">
                  {/* Status Toggle */}
                  <button
                    type="button"
                    onClick={() => store.toggleCarouselOfferActive(offer.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      offer.active !== false
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {offer.active !== false ? 'Active' : 'Disabled'}
                  </button>

                  {/* Reorder Buttons */}
                  <div className="flex items-center bg-[#F4EFEA] rounded-lg p-0.5 border border-[#E7E0D8]">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1.5 text-[#57534E] hover:text-[#1C1917] disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === offers.length - 1}
                      className="p-1.5 text-[#57534E] hover:text-[#1C1917] disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => setPreviewOffer(offer)}
                    className="p-2 text-[#57534E] hover:text-[#FF3B00] hover:bg-[#FEF2F2] rounded-lg transition-colors"
                    title="Preview Slide"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(offer)}
                    className="p-2 text-[#57534E] hover:text-[#1C1917] hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit Slide"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteOffer(offer.id, offer.title)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Slide"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Slide Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E7E0D8] shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-4">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1C1917] flex items-center gap-2">
                <Flame className="text-[#FF3B00]" size={22} />
                <span>{editingOffer ? 'Edit Offer Slide' : 'Create New Offer Slide'}</span>
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[#57534E] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOffer} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Badge Text *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="FLASH DEAL ⚡"
                    className="input-field text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Urgency / Expiry Text *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.expiryText}
                    onChange={(e) => setFormData({ ...formData, expiryText: e.target.value })}
                    placeholder="Valid for all new users"
                    className="input-field text-xs sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Headline Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="20% OFF YOUR FIRST ORDER"
                    className="input-field text-xs sm:text-sm uppercase font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Subtitle / Description *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="Taste Prayagraj’s finest wood-fired pizza crafted with 48h fermented dough."
                    className="input-field text-xs sm:text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Promo Coupon Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="WELCOME20"
                    className="input-field text-xs sm:text-sm font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Discount Badge Tag *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    placeholder="FLAT 20% OFF"
                    className="input-field text-xs sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Destination Button Link URL
                  </label>
                  <input
                    type="text"
                    value={formData.href}
                    onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                    placeholder="/menu"
                    className="input-field text-xs sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-xs font-semibold text-[#1C1917]">
                    Offer Slide Image Artwork *
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="relative w-24 h-24 rounded-xl border border-[#E7E0D8] bg-gray-100 overflow-hidden shrink-0">
                      {formData.imageUrl ? (
                        <img src={formData.imageUrl} alt="Offer preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon size={24} />
                          <span className="text-[9px] mt-1 font-bold">No Image</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 flex-1 w-full">
                      <input
                        type="text"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        placeholder="Paste image URL (Unsplash, CDN, etc.)"
                        className="input-field text-xs sm:text-sm"
                      />
                      <label className="btn btn-outline btn-xs inline-flex items-center gap-2 cursor-pointer relative overflow-hidden">
                        <Upload size={13} /> Upload Local Image File
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleImageFileUpload}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-[#E7E0D8] flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#1C1917] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 rounded border-[#E7E0D8] text-[#FF3B00]"
                    />
                    <span>Active & Visible on Homepage Carousel</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E7E0D8] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn bg-[#FF3B00] hover:bg-[#D63200] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg"
                >
                  {editingOffer ? 'Save Changes' : 'Create Slide'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
