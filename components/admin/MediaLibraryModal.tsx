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
  Trash2,
  CheckSquare,
  Square,
  Edit3,
  Save,
  AlertCircle,
  Tag,
  FileText,
} from 'lucide-react'
import {
  fetchAllMediaImages,
  saveUploadedImageToHistory,
  deleteMediaImages,
  updateImageMetadata,
  compressImageDataUrl,
  MediaImage,
} from '@/lib/utils/mediaLibrary'
import { toast } from 'sonner'

interface MediaLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (imageUrl: string, altText?: string) => void
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
  const [selectedAlt, setSelectedAlt] = useState<string>('')
  const [selectedTitle, setSelectedTitle] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [customUrlInput, setCustomUrlInput] = useState('')
  const [customAltInput, setCustomAltInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Bulk Selection Mode State
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [selectedBulkUrls, setSelectedBulkUrls] = useState<Set<string>>(new Set())
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ url: string; title: string } | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  // Load images on modal open
  useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentImage || '')
      setIsBulkMode(false)
      setSelectedBulkUrls(new Set())
      loadImages()
    }
  }, [isOpen, currentImage])

  const loadImages = async () => {
    setLoading(true)
    try {
      const items = await fetchAllMediaImages()
      setImages(items)

      // Sync alt text for initially selected image
      if (currentImage) {
        const found = items.find((i) => i.url === currentImage)
        if (found) {
          setSelectedAlt(found.alt || '')
          setSelectedTitle(found.title || '')
        }
      }
    } catch (err) {
      console.error('Error fetching media images:', err)
      toast.error('Could not load existing media images')
    } finally {
      setLoading(false)
    }
  }

  // Update alt text & title when active selection changes
  const handleSelectImage = (img: MediaImage) => {
    if (isBulkMode) {
      toggleBulkSelect(img.url)
      return
    }
    setSelectedUrl(img.url)
    setSelectedAlt(img.alt || '')
    setSelectedTitle(img.title || '')
  }

  // Toggle single bulk selection
  const toggleBulkSelect = (url: string) => {
    setSelectedBulkUrls((prev) => {
      const next = new Set(prev)
      if (next.has(url)) {
        next.delete(url)
      } else {
        next.add(url)
      }
      return next
    })
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
        const matchesAlt = (img.alt || '').toLowerCase().includes(q)
        const matchesCat = img.category.toLowerCase().includes(q)
        const matchesSource = img.source.toLowerCase().includes(q)
        return matchesTitle || matchesAlt || matchesCat || matchesSource
      }

      return true
    })
  }, [images, activeTab, searchQuery])

  // Select all / Deselect all in current filtered view
  const handleToggleSelectAll = () => {
    if (selectedBulkUrls.size === filteredImages.length && filteredImages.length > 0) {
      setSelectedBulkUrls(new Set())
    } else {
      setSelectedBulkUrls(new Set(filteredImages.map((i) => i.url)))
    }
  }

  // Handle single delete
  const confirmDeleteSingle = (img: MediaImage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setDeleteConfirmItem({ url: img.url, title: img.title })
  }

  const executeDeleteSingle = () => {
    if (!deleteConfirmItem) return
    deleteMediaImages([deleteConfirmItem.url])
    setImages((prev) => prev.filter((i) => i.url !== deleteConfirmItem.url))
    if (selectedUrl === deleteConfirmItem.url) {
      setSelectedUrl('')
      setSelectedAlt('')
      setSelectedTitle('')
    }
    toast.success(`Deleted "${deleteConfirmItem.title}" from library`)
    setDeleteConfirmItem(null)
  }

  // Handle bulk delete
  const executeBulkDelete = () => {
    const urlsToDelete = Array.from(selectedBulkUrls)
    if (urlsToDelete.length === 0) return

    deleteMediaImages(urlsToDelete)
    setImages((prev) => prev.filter((i) => !selectedBulkUrls.has(i.url)))
    if (selectedBulkUrls.has(selectedUrl)) {
      setSelectedUrl('')
      setSelectedAlt('')
      setSelectedTitle('')
    }
    toast.success(`Successfully deleted ${urlsToDelete.length} images`)
    setSelectedBulkUrls(new Set())
    setShowBulkDeleteConfirm(false)
    setIsBulkMode(false)
  }

  // Handle saving alt text and title
  const handleSaveAltText = () => {
    if (!selectedUrl) return
    updateImageMetadata(selectedUrl, {
      alt: selectedAlt.trim(),
      title: selectedTitle.trim() || undefined,
    })
    setImages((prev) =>
      prev.map((item) =>
        item.url === selectedUrl
          ? { ...item, alt: selectedAlt.trim(), title: selectedTitle.trim() || item.title }
          : item
      )
    )
    toast.success('Alt text & image metadata saved!')
  }

  // Handle local file upload
  const handleFileUpload = (file: File) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error(`"${file.name}" is not a valid image file. Please choose PNG, JPG, WebP, or SVG.`)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(`"${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max size is 10MB.`)
      return
    }

    setUploading(true)
    const toastId = toast.loading(`Uploading "${file.name}"...`)
    const reader = new FileReader()

    reader.onload = async () => {
      try {
        const rawDataUrl = reader.result as string
        const dataUrl = await compressImageDataUrl(rawDataUrl, 1200, 0.88)
        const titleName = file.name.replace(/\.[^/.]+$/, '')
        const autoAlt = `${titleName} - Pizza Expert Prayagraj`

        saveUploadedImageToHistory(dataUrl, titleName, autoAlt)
        setSelectedUrl(dataUrl)
        setSelectedTitle(titleName)
        setSelectedAlt(autoAlt)

        await loadImages()
        setActiveTab('uploaded')
        toast.success(`"${file.name}" uploaded successfully and added to Uploaded library!`, {
          id: toastId,
        })
      } catch (err: any) {
        console.error('File upload error:', err)
        toast.error('Failed to process image: ' + (err?.message || 'Unknown error'), {
          id: toastId,
        })
      } finally {
        setUploading(false)
      }
    }

    reader.onerror = () => {
      toast.error(`Failed to read file "${file.name}". Please try another image.`, {
        id: toastId,
      })
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
    // Save alt text if modified
    if (selectedAlt.trim()) {
      updateImageMetadata(selectedUrl, { alt: selectedAlt.trim() })
    }
    onSelect(selectedUrl, selectedAlt.trim())
    toast.success('Image selected successfully!')
    onClose()
  }

  const handleUseCustomUrl = async () => {
    if (!customUrlInput.trim()) {
      toast.error('Please enter a valid image URL')
      return
    }
    const cleanUrl = customUrlInput.trim()
    const autoAlt = customAltInput.trim() || 'Custom Web Image'

    saveUploadedImageToHistory(cleanUrl, 'Web Linked Image', autoAlt)
    setSelectedUrl(cleanUrl)
    setSelectedAlt(autoAlt)
    await loadImages()
    setActiveTab('uploaded')
    onSelect(cleanUrl, autoAlt)
    toast.success('Web image added to library and selected!')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] max-h-[820px] shadow-2xl border border-[#E7E0D8] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E7E0D8] flex items-center justify-between bg-[#FBF9F5]/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF3B00]/10 text-[#FF3B00] flex items-center justify-center font-bold">
              <ImageIcon size={20} />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-[#1C1917] flex items-center gap-2">
                <span>{title}</span>
                {isBulkMode && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Bulk Mode Active
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#78716C]">
                Manage, add SEO alt text, delete, or choose from database and uploaded images.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-[#78716C] hover:text-[#1C1917] hover:bg-[#E7E0D8]/50 rounded-xl transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search, Filter & Bulk Controls Bar */}
        <div className="p-3 sm:px-5 border-b border-[#E7E0D8] bg-white flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shrink-0">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, alt text, or food category..."
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

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Selection Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsBulkMode(!isBulkMode)
                setSelectedBulkUrls(new Set())
              }}
              className={`btn btn-sm text-xs font-semibold px-3 py-2 flex items-center gap-1.5 transition-colors ${
                isBulkMode
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                  : 'btn-outline bg-white text-[#1C1917]'
              }`}
            >
              {isBulkMode ? <CheckSquare size={14} /> : <Square size={14} />}
              <span>{isBulkMode ? 'Exit Bulk Select' : 'Bulk Select'}</span>
            </button>

            {/* Bulk Delete Button if items are selected */}
            {isBulkMode && (
              <>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="btn btn-outline btn-sm text-xs px-2.5 bg-white"
                >
                  {selectedBulkUrls.size === filteredImages.length && filteredImages.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </button>

                <button
                  type="button"
                  disabled={selectedBulkUrls.size === 0}
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="btn btn-sm bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 flex items-center gap-1.5 disabled:opacity-40 shadow-xs"
                >
                  <Trash2 size={13} />
                  <span>Delete ({selectedBulkUrls.size})</span>
                </button>
              </>
            )}

            {!isBulkMode && (
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
            )}

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

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-[#FAF8F5]/30">
          {activeTab === 'upload_new' ? (
            /* Upload & Custom URL Panel */
            <div className="max-w-xl mx-auto space-y-5 py-3">
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

              {/* Paste URL with Alt text */}
              <div className="bg-white p-5 rounded-2xl border border-[#E7E0D8] shadow-xs space-y-3">
                <h3 className="font-semibold text-xs text-[#1C1917] flex items-center gap-2">
                  <LinkIcon size={14} className="text-[#FF3B00]" /> Paste Image Web Link & Alt Text
                </h3>
                <div className="space-y-2">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="input-field text-xs w-full"
                  />
                  <input
                    type="text"
                    value={customAltInput}
                    onChange={(e) => setCustomAltInput(e.target.value)}
                    placeholder="Describe image for SEO & Accessibility (Alt Text)"
                    className="input-field text-xs w-full"
                  />
                  <button
                    onClick={handleUseCustomUrl}
                    className="btn btn-primary btn-sm text-xs w-full mt-1"
                  >
                    Add & Use URL Image
                  </button>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-[#78716C]">
              <RefreshCw size={28} className="animate-spin text-[#FF3B00]" />
              <p className="text-xs font-semibold">Scanning media library and database...</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-center p-6 bg-white rounded-2xl border border-[#E7E0D8]">
              <ImageIcon size={36} className="text-[#A8A29E]" />
              <p className="font-semibold text-sm text-[#1C1917]">No images found</p>
              <p className="text-xs text-[#78716C] max-w-sm">
                No images matched your search or filter. Try clearing your filters or uploading a new image.
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredImages.map((img) => {
                const isSelected = selectedUrl === img.url
                const isBulkChecked = selectedBulkUrls.has(img.url)

                return (
                  <div
                    key={img.id}
                    onClick={() => handleSelectImage(img)}
                    className={`group relative bg-white rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md flex flex-col ${
                      isBulkMode && isBulkChecked
                        ? 'border-amber-600 ring-3 ring-amber-500/25 shadow-md'
                        : isSelected && !isBulkMode
                        ? 'border-[#FF3B00] ring-3 ring-[#FF3B00]/25 shadow-md'
                        : 'border-[#E7E0D8] hover:border-[#FF3B00]/50 hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Image Thumbnail Container */}
                    <div className="relative aspect-4/3 bg-[#FBF9F5] overflow-hidden">
                      <Image
                        src={img.url}
                        alt={img.alt || img.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        unoptimized={img.url.startsWith('data:')}
                      />

                      {/* Selected checkmark overlay (Normal Mode) */}
                      {!isBulkMode && isSelected && (
                        <div className="absolute inset-0 bg-[#FF3B00]/20 backdrop-blur-[1px] flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-[#FF3B00] text-white flex items-center justify-center shadow-lg transform scale-110">
                            <Check size={18} strokeWidth={3} />
                          </div>
                        </div>
                      )}

                      {/* Bulk Checkbox Overlay (Bulk Mode) */}
                      {isBulkMode && (
                        <div className="absolute top-2 right-2 z-10">
                          <div className={`w-6 h-6 rounded-md border flex items-center justify-center shadow-sm ${
                            isBulkChecked ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white/90 border-[#A8A29E] text-transparent'
                          }`}>
                            <Check size={14} strokeWidth={3} />
                          </div>
                        </div>
                      )}

                      {/* Quick Delete icon on hover (Normal Mode) */}
                      {!isBulkMode && (
                        <button
                          type="button"
                          onClick={(e) => confirmDeleteSingle(img, e)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md"
                          title="Delete Image"
                        >
                          <Trash2 size={13} />
                        </button>
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
                        {img.source === 'database' ? 'DB' : img.source === 'uploaded' ? 'Upload' : 'Stock'}
                      </span>
                    </div>

                    {/* Image Info & Alt text preview */}
                    <div className="p-2.5 bg-white flex flex-col justify-between gap-1 border-t border-[#E7E0D8]/60 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-[#1C1917] truncate" title={img.title}>
                          {img.title}
                        </span>
                        {!isBulkMode && isSelected && <CheckCircle2 size={13} className="text-[#FF3B00] shrink-0" />}
                      </div>
                      {img.alt && (
                        <p className="text-[10px] text-[#78716C] truncate flex items-center gap-1" title={img.alt}>
                          <Tag size={10} className="shrink-0 text-[#A8A29E]" />
                          <span>{img.alt}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected Image & Alt Text Editor Footer */}
        <div className="p-3 sm:p-4 border-t border-[#E7E0D8] bg-white flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shrink-0">
          {selectedUrl && !isBulkMode ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
              {/* Thumbnail preview */}
              <div className="w-12 h-12 rounded-xl border border-[#E7E0D8] overflow-hidden relative shrink-0 bg-[#FBF9F5] shadow-xs">
                <Image
                  src={selectedUrl}
                  alt={selectedAlt || 'Preview'}
                  fill
                  className="object-cover"
                  unoptimized={selectedUrl.startsWith('data:')}
                />
              </div>

              {/* Alt Text & Metadata Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 w-full">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#1C1917] mb-0.5">
                    <span className="flex items-center gap-1">
                      <Edit3 size={11} className="text-[#FF3B00]" /> Image Title
                    </span>
                  </div>
                  <input
                    type="text"
                    value={selectedTitle}
                    onChange={(e) => setSelectedTitle(e.target.value)}
                    placeholder="e.g. Margherita Pizza Large"
                    className="input-field text-xs py-1.5 px-2.5 h-8 bg-[#FBF9F5]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#1C1917] mb-0.5">
                    <span className="flex items-center gap-1">
                      <Tag size={11} className="text-[#B91C1C]" /> Alt Text (SEO / Accessibility)
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveAltText}
                      className="text-[10px] text-[#FF3B00] hover:underline font-bold"
                    >
                      Save Metadata
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={selectedAlt}
                      onChange={(e) => setSelectedAlt(e.target.value)}
                      placeholder="Descriptive alt text..."
                      className="input-field text-xs py-1.5 px-2.5 h-8 bg-[#FBF9F5] flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleSaveAltText}
                      className="btn btn-secondary btn-xs h-8 px-2 flex items-center gap-1 text-[10px]"
                      title="Save Alt Text"
                    >
                      <Save size={11} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : isBulkMode ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1C1917]">
              <CheckSquare size={16} className="text-amber-600" />
              <span>
                {selectedBulkUrls.size} of {filteredImages.length} images selected in view.
              </span>
            </div>
          ) : (
            <p className="text-xs text-[#78716C] italic">Click any image to select, add alt text, or manage</p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 justify-end shrink-0">
            {selectedUrl && !isBulkMode && (
              <button
                type="button"
                onClick={() => setDeleteConfirmItem({ url: selectedUrl, title: selectedTitle || 'Selected Image' })}
                className="btn btn-outline btn-sm text-xs text-red-600 hover:bg-red-50 border-red-200 px-3 flex items-center gap-1"
                title="Delete this image"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline btn-sm text-xs px-3.5"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!selectedUrl || isBulkMode}
              onClick={handleApplySelection}
              className="btn btn-primary btn-sm text-xs font-bold px-4 flex items-center gap-1.5 disabled:opacity-40"
            >
              <Check size={14} />
              <span>Use Selected Image</span>
            </button>
          </div>
        </div>
      </div>

      {/* Single Delete Confirmation Dialog */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#E7E0D8] space-y-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#1C1917]">Delete Image?</h3>
              <p className="text-xs text-[#78716C] mt-1">
                Are you sure you want to remove <strong className="text-[#1C1917]">"{deleteConfirmItem.title}"</strong> from the media library?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E0D8]">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="btn btn-outline btn-sm text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteSingle}
                className="btn bg-red-600 hover:bg-red-700 text-white btn-sm text-xs font-bold"
              >
                Delete Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#E7E0D8] space-y-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#1C1917]">Bulk Delete Images</h3>
              <p className="text-xs text-[#78716C] mt-1">
                Are you sure you want to permanently delete <strong className="text-[#1C1917]">{selectedBulkUrls.size}</strong> selected images from the media library?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E0D8]">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="btn btn-outline btn-sm text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeBulkDelete}
                className="btn bg-red-600 hover:bg-red-700 text-white btn-sm text-xs font-bold"
              >
                Delete {selectedBulkUrls.size} Images
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
