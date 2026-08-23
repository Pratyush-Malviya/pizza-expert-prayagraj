'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import {
  X,
  Search,
  Upload,
  Check,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Link as LinkIcon,
  RefreshCw,
  Clock,
  Database,
  CheckCircle2,
} from 'lucide-react'
import { fetchAllMediaImages, saveUploadedImageToHistory, MediaImage } from '@/lib/utils/mediaLibrary'
import { toast } from 'sonner'

interface MediaLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (imageUrl: string) => void
  currentImage?: string | null
  title?: string
}

type TabType = 'all' | 'database' | 'uploaded' | 'pizzas' | 'burgers' | 'pasta' | 'sides' | 'beverages' | 'combos' | 'upload_new'

export default function MediaLibraryModal({
  isOpen,
  onClose,
  onSelect,
  currentImage,
  title = 'Choose or Upload Image',
}: MediaLibraryModalProps) {
  const [images, setImages] = useState<MediaImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUrl, setSelectedUrl] = useState<string>(currentImage || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [customUrlInput, setCustomUrlInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Load images on modal open
  useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentImage || '')
      loadImages()
    }
  }, [isOpen, currentImage])

  const loadImages = async () => {
    setLoading(true)
    try {
      const items = await fetchAllMediaImages()
      setImages(items)
    } catch (err) {
      console.error('Error fetching media images:', err)
      toast.error('Could not load existing media images')
    } finally {
      setLoading(false)
    }
  }

  // Filter images based on tab and search
  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      // Tab filter
      if (activeTab === 'database' && img.source !== 'database') return false
      if (activeTab === 'uploaded' && img.source !== 'uploaded') return false
      if (activeTab === 'pizzas' && img.category !== 'pizzas') return false
      if (activeTab === 'burgers' && img.category !== 'burgers') return false
      if (activeTab === 'pasta' && img.category !== 'pasta') return false
      if (activeTab === 'sides' && img.category !== 'sides') return false
      if (activeTab === 'beverages' && img.category !== 'beverages') return false
      if (activeTab === 'combos' && img.category !== 'combos') return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesTitle = img.title.toLowerCase().includes(q)
        const matchesCat = img.category.toLowerCase().includes(q)
        const matchesSource = img.source.toLowerCase().includes(q)
        return matchesTitle || matchesCat || matchesSource
      }

      return true
    })
  }, [images, activeTab, searchQuery])

  // Handle local file upload
  const handleFileUpload = (file: File) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WebP, SVG)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setUploading(true)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      saveUploadedImageToHistory(dataUrl, file.name.replace(/\.[^/.]+$/, ''))
      setSelectedUrl(dataUrl)
      toast.success('Image uploaded & added to library!')
      setUploading(false)
      loadImages()
      setActiveTab('all')
    }
    reader.onerror = () => {
      toast.error('Failed to read file')
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleApplySelection = () => {
    if (!selectedUrl) {
      toast.error('Please select an image first')
      return
    }
    onSelect(selectedUrl)
    onClose()
  }

  const handleUseCustomUrl = () => {
    if (!customUrlInput.trim()) {
      toast.error('Please enter a valid URL')
      return
    }
    saveUploadedImageToHistory(customUrlInput.trim(), 'Custom URL Image')
    setSelectedUrl(customUrlInput.trim())
    onSelect(customUrlInput.trim())
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] max-h-[750px] shadow-2xl border border-[#E7E0D8] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E7E0D8] flex items-center justify-between bg-[#FBF9F5]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF3B00]/10 text-[#FF3B00] flex items-center justify-center font-bold">
              <ImageIcon size={20} />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-[#1C1917]">{title}</h2>
              <p className="text-xs text-[#78716C]">
                Select from existing database items, stock photography, or upload a new file.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#78716C] hover:text-[#1C1917] hover:bg-[#E7E0D8]/50 rounded-xl transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Action Bar */}
        <div className="p-3 sm:px-5 border-b border-[#E7E0D8] bg-white flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search images by name, food item, or category..."
              className="w-full bg-[#FBF9F5] border border-[#E7E0D8] text-xs font-medium rounded-xl pl-9 pr-4 py-2 text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#FF3B00] focus:ring-2 focus:ring-[#FF3B00]/15"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A8A29E] hover:text-[#1C1917]"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="btn btn-primary btn-sm flex items-center gap-1.5 cursor-pointer text-xs font-semibold px-3 py-2">
              <Upload size={14} />
              <span>Upload New</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
            </label>
            <button
              onClick={loadImages}
              className="p-2 border border-[#E7E0D8] rounded-xl hover:bg-[#FBF9F5] text-[#78716C] hover:text-[#1C1917] transition-colors"
              title="Refresh images"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Category Navigation Tabs */}
        <div className="px-3 sm:px-5 pt-2 border-b border-[#E7E0D8] bg-[#FBF9F5]/40 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'all', label: 'All Images', icon: Layers, count: images.length },
            { id: 'database', label: 'Database Items', icon: Database, count: images.filter(i => i.source === 'database').length },
            { id: 'uploaded', label: 'Uploads', icon: Clock, count: images.filter(i => i.source === 'uploaded').length },
            { id: 'pizzas', label: 'Pizzas', icon: Sparkles },
            { id: 'burgers', label: 'Burgers' },
            { id: 'pasta', label: 'Pasta' },
            { id: 'sides', label: 'Sides & Fries' },
            { id: 'beverages', label: 'Beverages' },
            { id: 'combos', label: 'Combos' },
            { id: 'upload_new', label: 'Drop / Paste URL', icon: LinkIcon },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'border-[#FF3B00] text-[#FF3B00] bg-white shadow-xs'
                    : 'border-transparent text-[#78716C] hover:text-[#1C1917] hover:bg-white/60'
                }`}
              >
                {Icon && <Icon size={13} />}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-[#FF3B00]/10 text-[#FF3B00]' : 'bg-[#E7E0D8] text-[#78716C]'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Modal Main Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[#FAF8F5]/30">
          {activeTab === 'upload_new' ? (
            /* Upload & Custom URL Panel */
            <div className="max-w-xl mx-auto space-y-6 py-4">
              {/* Drag and drop upload */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all bg-white flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-[#FF3B00] bg-[#FF3B00]/5 scale-[1.01]'
                    : 'border-[#E7E0D8] hover:border-[#FF3B00]/40'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#FF3B00]/10 text-[#FF3B00] flex items-center justify-center">
                  <Upload size={28} className={uploading ? 'animate-bounce' : ''} />
                </div>
                <div>
                  <p className="font-serif font-bold text-sm text-[#1C1917]">
                    {uploading ? 'Processing Image...' : 'Drag & drop your image here'}
                  </p>
                  <p className="text-xs text-[#78716C] mt-1">Supports PNG, JPG, WebP, SVG up to 5MB</p>
                </div>
                <label className="btn btn-primary btn-sm mt-2 cursor-pointer text-xs">
                  Browse Device
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                </label>
              </div>

              {/* Paste URL */}
              <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-3">
                <h3 className="font-semibold text-xs text-[#1C1917] flex items-center gap-2">
                  <LinkIcon size={14} className="text-[#FF3B00]" /> Paste Image Web Link
                </h3>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="input-field text-xs flex-1"
                  />
                  <button
                    onClick={handleUseCustomUrl}
                    className="btn btn-secondary btn-sm text-xs shrink-0"
                  >
                    Apply URL
                  </button>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-[#78716C]">
              <RefreshCw size={28} className="animate-spin text-[#FF3B00]" />
              <p className="text-xs font-semibold">Scanning database and library images...</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-center p-6 bg-white rounded-2xl border border-[#E7E0D8]">
              <ImageIcon size={36} className="text-[#A8A29E]" />
              <p className="font-semibold text-sm text-[#1C1917]">No images found</p>
              <p className="text-xs text-[#78716C] max-w-sm">
                No images matched your search or category filter. Try clearing your search or uploading a new image.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setActiveTab('all') }}
                className="btn btn-outline btn-xs mt-2"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            /* Images Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {filteredImages.map((img) => {
                const isSelected = selectedUrl === img.url
                return (
                  <div
                    key={img.id}
                    onClick={() => setSelectedUrl(img.url)}
                    className={`group relative bg-white rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md ${
                      isSelected
                        ? 'border-[#FF3B00] ring-3 ring-[#FF3B00]/25 shadow-md'
                        : 'border-[#E7E0D8] hover:border-[#FF3B00]/50 hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Image Aspect Box */}
                    <div className="relative aspect-4/3 bg-[#FBF9F5] overflow-hidden">
                      <Image
                        src={img.url}
                        alt={img.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        unoptimized={img.url.startsWith('data:')}
                      />

                      {/* Selected checkmark overlay */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#FF3B00]/20 backdrop-blur-[1px] flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-[#FF3B00] text-white flex items-center justify-center shadow-lg transform scale-110">
                            <Check size={18} strokeWidth={3} />
                          </div>
                        </div>
                      )}

                      {/* Source badge */}
                      <span
                        className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider shadow-xs backdrop-blur-xs ${
                          img.source === 'database'
                            ? 'bg-emerald-600/90 text-white'
                            : img.source === 'uploaded'
                            ? 'bg-purple-600/90 text-white'
                            : 'bg-black/60 text-white'
                        }`}
                      >
                        {img.source === 'database' ? 'DB Item' : img.source === 'uploaded' ? 'Upload' : 'Stock'}
                      </span>
                    </div>

                    {/* Image Title */}
                    <div className="p-2.5 bg-white flex items-center justify-between gap-1 border-t border-[#E7E0D8]/60">
                      <span className="text-xs font-semibold text-[#1C1917] truncate" title={img.title}>
                        {img.title}
                      </span>
                      {isSelected && <CheckCircle2 size={14} className="text-[#FF3B00] shrink-0" />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer / Selected Image Bar */}
        <div className="p-3 sm:p-4 border-t border-[#E7E0D8] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
            {selectedUrl ? (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg border border-[#E7E0D8] overflow-hidden relative shrink-0 bg-[#FBF9F5]">
                  <Image
                    src={selectedUrl}
                    alt="Selected"
                    fill
                    className="object-cover"
                    unoptimized={selectedUrl.startsWith('data:')}
                  />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-[#1C1917] flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-[#FF3B00]" />
                    <span>Image Selected</span>
                  </p>
                  <p className="text-[11px] text-[#78716C] truncate max-w-[280px] sm:max-w-xs font-mono">
                    {selectedUrl.startsWith('data:') ? 'Custom Upload (Data URL)' : selectedUrl}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#78716C] italic">No image currently selected</p>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline btn-sm text-xs px-4"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedUrl}
              onClick={handleApplySelection}
              className="btn btn-primary btn-sm text-xs font-bold px-5 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check size={14} />
              <span>Use Selected Image</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
