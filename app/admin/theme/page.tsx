'use client'

import { useState, useEffect } from 'react'
import {
  Palette, Type, Layout, HelpCircle, Save, Plus, Edit2, Trash2,
  Upload, RotateCcw, Check, Sparkles, Image as ImageIcon, FileText
} from 'lucide-react'
import { toast } from 'sonner'
import { useSettingsStore, FaqItem } from '@/lib/store/useSettingsStore'
import Image from 'next/image'
import MediaLibraryModal from '@/components/admin/MediaLibraryModal'
import { saveUploadedImageToHistory } from '@/lib/utils/mediaLibrary'

const FONT_OPTIONS = [
  { label: 'Plus Jakarta Sans (Default)', value: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" },
  { label: 'Inter (Modern Tech)', value: "'Inter', sans-serif" },
  { label: 'Roboto (Clean & Legible)', value: "'Roboto', sans-serif" },
  { label: 'Playfair Display (Serif Elegance)', value: "'Playfair Display', serif" },
  { label: 'Montserrat (Bold & Modern)', value: "'Montserrat', sans-serif" },
]

export default function AdminThemeCustomizerPage() {
  const store = useSettingsStore()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'theme' | 'hero' | 'content' | 'faqs'>('theme')
  const [mediaModalOpen, setMediaModalOpen] = useState(false)

  // Form State
  const [themeState, setThemeState] = useState({
    themePrimaryColor: store.themePrimaryColor,
    themeSecondaryColor: store.themeSecondaryColor,
    themeBackgroundColor: store.themeBackgroundColor,
    themeTextColor: store.themeTextColor,
    themeFontFamily: store.themeFontFamily,

    heroBadge: store.heroBadge,
    heroTitleLine1: store.heroTitleLine1,
    heroTitleSub: store.heroTitleSub,
    heroTitleLine2: store.heroTitleLine2,
    heroDescription: store.heroDescription,
    heroPrimaryBtnText: store.heroPrimaryBtnText,
    heroPrimaryBtnLink: store.heroPrimaryBtnLink,
    heroSecondaryBtnText: store.heroSecondaryBtnText,
    heroSecondaryBtnLink: store.heroSecondaryBtnLink,
    heroImageUrl: store.heroImageUrl,

    aboutHeading: store.aboutHeading,
    aboutParagraph: store.aboutParagraph,
    menuTitle: store.menuTitle,
    menuSubtitle: store.menuSubtitle,
  })

  // FAQ Modal State
  const [showFaqModal, setShowFaqModal] = useState(false)
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null)
  const [faqForm, setFaqForm] = useState({
    category: 'Ordering & Delivery',
    question: '',
    answer: '',
  })

  useEffect(() => {
    queueMicrotask(() => {
      setThemeState({
        themePrimaryColor: store.themePrimaryColor || '#e10600',
        themeSecondaryColor: store.themeSecondaryColor || '#4f0423',
        themeBackgroundColor: store.themeBackgroundColor || '#260212',
        themeTextColor: store.themeTextColor || '#ffffff',
        themeFontFamily: store.themeFontFamily || "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",

        heroBadge: store.heroBadge || 'EST. 2018 • ALLAPUR, PRAYAGRAJ',
        heroTitleLine1: store.heroTitleLine1 || 'WOOD-FIRED',
        heroTitleSub: store.heroTitleSub || '(FROM ALLAPUR)',
        heroTitleLine2: store.heroTitleLine2 || 'REAL PIZZA.',
        heroDescription: store.heroDescription || 'Authentic wood-fired pizza crafted daily in Allapur with slow-fermented 48-hour dough, real mozzarella, and aromatic basil leaves.',
        heroPrimaryBtnText: store.heroPrimaryBtnText || 'ORDER ONLINE',
        heroPrimaryBtnLink: store.heroPrimaryBtnLink || '/menu',
        heroSecondaryBtnText: store.heroSecondaryBtnText || 'FIND STORE & DEALS',
        heroSecondaryBtnLink: store.heroSecondaryBtnLink || '/offers',
        heroImageUrl: store.heroImageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80',

        aboutHeading: store.aboutHeading || 'Crafted With Passion & Wood Fire',
        aboutParagraph: store.aboutParagraph || 'Pizza Expert Prayagraj brings authentic wood-fired pizzas to Allapur and across Prayagraj.',
        menuTitle: store.menuTitle || 'Our Full Menu',
        menuSubtitle: store.menuSubtitle || 'Wood-fired pizzas, crispy burgers, pasta, sides & drinks delivered piping hot across Prayagraj.',
      })
      setMounted(true)
    })
  }, [store])

  if (!mounted) return null

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault()
    store.updateSettings(themeState)
    toast.success('Theme & Content settings saved successfully!')
  }

  const handleResetTheme = () => {
    const defaults = {
      themePrimaryColor: '#e10600',
      themeSecondaryColor: '#4f0423',
      themeBackgroundColor: '#260212',
      themeTextColor: '#ffffff',
      themeFontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
    }
    setThemeState((prev) => ({ ...prev, ...defaults }))
    store.updateSettings(defaults)
    toast.success('Theme colors reset to default!')
  }

  const handleHeroImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image file must be less than 2MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setThemeState((prev) => ({ ...prev, heroImageUrl: result }))
      saveUploadedImageToHistory(result, 'Hero Featured Image')
      toast.success('Hero image updated')
    }
    reader.readAsDataURL(file)
  }

  // FAQ Handlers
  const openCreateFaqModal = () => {
    setEditingFaq(null)
    setFaqForm({ category: 'Ordering & Delivery', question: '', answer: '' })
    setShowFaqModal(true)
  }

  const openEditFaqModal = (faq: FaqItem) => {
    setEditingFaq(faq)
    setFaqForm({ category: faq.category, question: faq.question, answer: faq.answer })
    setShowFaqModal(true)
  }

  const handleSaveFaq = (e: React.FormEvent) => {
    e.preventDefault()
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      toast.error('Question and Answer are required')
      return
    }

    if (editingFaq) {
      store.updateFaq(editingFaq.id, faqForm)
      toast.success('FAQ updated')
    } else {
      store.addFaq(faqForm)
      toast.success('New FAQ added')
    }
    setShowFaqModal(false)
  }

  const handleDeleteFaq = (id: string) => {
    if (confirm('Delete this FAQ item?')) {
      store.deleteFaq(id)
      toast.success('FAQ deleted')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917]">
            Theme & Content Customizer
          </h1>
          <p className="text-[#57534E] text-xs sm:text-sm">
            Customize colors, typography, hero banner text/images, section headings, and FAQs.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="btn btn-primary flex items-center gap-2 text-xs sm:text-sm self-start sm:self-auto"
        >
          <Save size={16} /> Save All Changes
        </button>
      </div>

      {/* Category Navigation Tabs */}
      <div className="bg-white rounded-xl p-1.5 border border-[#E7E0D8] shadow-xs flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('theme')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'theme'
              ? 'bg-[#B91C1C] text-white shadow-xs'
              : 'text-[#57534E] hover:bg-[#FBF9F5] hover:text-[#1C1917]'
          }`}
        >
          <Palette size={16} /> Colors & Typography
        </button>
        <button
          onClick={() => setActiveTab('hero')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'hero'
              ? 'bg-[#B91C1C] text-white shadow-xs'
              : 'text-[#57534E] hover:bg-[#FBF9F5] hover:text-[#1C1917]'
          }`}
        >
          <Layout size={16} /> Hero Banner Editor
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'content'
              ? 'bg-[#B91C1C] text-white shadow-xs'
              : 'text-[#57534E] hover:bg-[#FBF9F5] hover:text-[#1C1917]'
          }`}
        >
          <FileText size={16} /> Headings & Paragraphs
        </button>
        <button
          onClick={() => setActiveTab('faqs')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'faqs'
              ? 'bg-[#B91C1C] text-white shadow-xs'
              : 'text-[#57534E] hover:bg-[#FBF9F5] hover:text-[#1C1917]'
          }`}
        >
          <HelpCircle size={16} /> FAQ Manager ({store.faqs.length})
        </button>
      </div>

      {/* TAB 1: THEME COLORS & TYPOGRAPHY */}
      {activeTab === 'theme' && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-4">
              <div>
                <h2 className="font-serif font-bold text-lg text-[#1C1917] flex items-center gap-2">
                  <Palette size={18} className="text-[#B91C1C]" /> Theme Colors
                </h2>
                <p className="text-xs text-[#57534E]">Customize your brand palette across buttons, cards, and floors.</p>
              </div>
              <button
                type="button"
                onClick={handleResetTheme}
                className="btn btn-outline btn-sm text-xs flex items-center gap-1.5"
              >
                <RotateCcw size={14} /> Reset Defaults
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Primary Color */}
              <div className="p-4 bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#1C1917]">Primary Color (Buttons/Badges)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={themeState.themePrimaryColor}
                    onChange={(e) => setThemeState({ ...themeState, themePrimaryColor: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-[#E7E0D8]"
                  />
                  <input
                    type="text"
                    value={themeState.themePrimaryColor}
                    onChange={(e) => setThemeState({ ...themeState, themePrimaryColor: e.target.value })}
                    className="input-field font-mono text-xs uppercase"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div className="p-4 bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#1C1917]">Secondary Accent / Cards</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={themeState.themeSecondaryColor}
                    onChange={(e) => setThemeState({ ...themeState, themeSecondaryColor: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-[#E7E0D8]"
                  />
                  <input
                    type="text"
                    value={themeState.themeSecondaryColor}
                    onChange={(e) => setThemeState({ ...themeState, themeSecondaryColor: e.target.value })}
                    className="input-field font-mono text-xs uppercase"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div className="p-4 bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#1C1917]">Hero Canvas Background</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={themeState.themeBackgroundColor}
                    onChange={(e) => setThemeState({ ...themeState, themeBackgroundColor: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-[#E7E0D8]"
                  />
                  <input
                    type="text"
                    value={themeState.themeBackgroundColor}
                    onChange={(e) => setThemeState({ ...themeState, themeBackgroundColor: e.target.value })}
                    className="input-field font-mono text-xs uppercase"
                  />
                </div>
              </div>

              {/* Text Color */}
              <div className="p-4 bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#1C1917]">Hero Text / Accent Text</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={themeState.themeTextColor}
                    onChange={(e) => setThemeState({ ...themeState, themeTextColor: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-[#E7E0D8]"
                  />
                  <input
                    type="text"
                    value={themeState.themeTextColor}
                    onChange={(e) => setThemeState({ ...themeState, themeTextColor: e.target.value })}
                    className="input-field font-mono text-xs uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Typography */}
            <div className="pt-4 border-t border-[#E7E0D8] space-y-3">
              <h3 className="font-serif font-bold text-base text-[#1C1917] flex items-center gap-2">
                <Type size={16} className="text-[#B91C1C]" /> Typography & Font Family
              </h3>
              <div className="max-w-md">
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Base Font Family</label>
                <select
                  value={themeState.themeFontFamily}
                  onChange={(e) => setThemeState({ ...themeState, themeFontFamily: e.target.value })}
                  className="input-field bg-white"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Color Card Preview */}
            <div className="p-5 rounded-xl border border-[#E7E0D8] space-y-3" style={{ backgroundColor: themeState.themeBackgroundColor }}>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#ffc7c6]">Live Palette Preview</span>
              <h3 className="font-serif font-black text-2xl uppercase" style={{ color: themeState.themePrimaryColor }}>
                WOOD-FIRED PIZZA
              </h3>
              <p className="text-xs" style={{ color: themeState.themeTextColor }}>
                Experience live color customization across your storefront components.
              </p>
              <div className="flex gap-2 pt-1">
                <button type="button" className="btn btn-sm px-4 rounded-lg font-bold text-xs" style={{ backgroundColor: themeState.themePrimaryColor, color: '#ffffff' }}>
                  ORDER ONLINE
                </button>
                <button type="button" className="btn btn-sm px-4 rounded-lg font-bold text-xs border" style={{ borderColor: themeState.themeTextColor, color: themeState.themeTextColor }}>
                  FIND STORE
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: HERO BANNER EDITOR */}
      {activeTab === 'hero' && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-6">
            <h2 className="font-serif font-bold text-lg text-[#1C1917] border-b border-[#E7E0D8] pb-3 flex items-center gap-2">
              <Layout size={18} className="text-[#B91C1C]" /> Hero Banner Content & Headlines
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Top Badge Pill Text</label>
                <input
                  type="text"
                  value={themeState.heroBadge}
                  onChange={(e) => setThemeState({ ...themeState, heroBadge: e.target.value })}
                  className="input-field"
                  placeholder="e.g. EST. 2018 • ALLAPUR, PRAYAGRAJ"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Main Headline - Line 1 (Red)</label>
                <input
                  type="text"
                  value={themeState.heroTitleLine1}
                  onChange={(e) => setThemeState({ ...themeState, heroTitleLine1: e.target.value })}
                  className="input-field font-bold uppercase"
                  placeholder="e.g. WOOD-FIRED"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Subhead Tagline (White Italic)</label>
                <input
                  type="text"
                  value={themeState.heroTitleSub}
                  onChange={(e) => setThemeState({ ...themeState, heroTitleSub: e.target.value })}
                  className="input-field"
                  placeholder="e.g. (FROM ALLAPUR)"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Main Headline - Line 2 (Red)</label>
                <input
                  type="text"
                  value={themeState.heroTitleLine2}
                  onChange={(e) => setThemeState({ ...themeState, heroTitleLine2: e.target.value })}
                  className="input-field font-bold uppercase"
                  placeholder="e.g. REAL PIZZA."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Hero Subtitle Paragraph</label>
                <textarea
                  rows={3}
                  value={themeState.heroDescription}
                  onChange={(e) => setThemeState({ ...themeState, heroDescription: e.target.value })}
                  className="input-field"
                  placeholder="Describe your pizza story..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Primary Button Text</label>
                <input
                  type="text"
                  value={themeState.heroPrimaryBtnText}
                  onChange={(e) => setThemeState({ ...themeState, heroPrimaryBtnText: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Primary Button Link</label>
                <input
                  type="text"
                  value={themeState.heroPrimaryBtnLink}
                  onChange={(e) => setThemeState({ ...themeState, heroPrimaryBtnLink: e.target.value })}
                  className="input-field font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Secondary Button Text</label>
                <input
                  type="text"
                  value={themeState.heroSecondaryBtnText}
                  onChange={(e) => setThemeState({ ...themeState, heroSecondaryBtnText: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Secondary Button Link</label>
                <input
                  type="text"
                  value={themeState.heroSecondaryBtnLink}
                  onChange={(e) => setThemeState({ ...themeState, heroSecondaryBtnLink: e.target.value })}
                  className="input-field font-mono text-xs"
                />
              </div>
            </div>

            {/* Hero Image Upload & Link */}
            <div className="border-t border-[#E7E0D8] pt-4 space-y-4">
              <h3 className="font-serif font-bold text-base text-[#1C1917] flex items-center gap-2">
                <ImageIcon size={16} className="text-[#B91C1C]" /> Hero Featured Image
              </h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="relative w-36 h-28 rounded-xl border border-[#E7E0D8] bg-[#FBF9F5] overflow-hidden shrink-0">
                  {themeState.heroImageUrl ? (
                    <Image src={themeState.heroImageUrl} alt="Hero preview" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#A8A29E]">No Image</div>
                  )}
                </div>
                <div className="space-y-2 flex-1 w-full">
                  <input
                    type="text"
                    value={themeState.heroImageUrl}
                    onChange={(e) => setThemeState({ ...themeState, heroImageUrl: e.target.value })}
                    className="input-field text-xs"
                    placeholder="https://..."
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaModalOpen(true)}
                      className="btn btn-outline btn-sm inline-flex items-center gap-2 text-xs bg-white text-[#B91C1C] border-[#B91C1C]/40 hover:bg-[#B91C1C]/5 font-semibold"
                    >
                      <ImageIcon size={14} /> Choose from Library
                    </button>
                    <label className="btn btn-outline btn-sm inline-flex items-center gap-2 cursor-pointer relative overflow-hidden text-xs bg-white">
                      <Upload size={14} /> Upload Custom Hero Image
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleHeroImageUpload}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: HEADINGS & PARAGRAPHS */}
      {activeTab === 'content' && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-6">
            <h2 className="font-serif font-bold text-lg text-[#1C1917] border-b border-[#E7E0D8] pb-3 flex items-center gap-2">
              <FileText size={18} className="text-[#B91C1C]" /> Page Headings & Descriptions
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">About Section Title</label>
                <input
                  type="text"
                  value={themeState.aboutHeading}
                  onChange={(e) => setThemeState({ ...themeState, aboutHeading: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">About Section Story Paragraph</label>
                <textarea
                  rows={4}
                  value={themeState.aboutParagraph}
                  onChange={(e) => setThemeState({ ...themeState, aboutParagraph: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 border-t border-[#E7E0D8] pt-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">Menu Page Title</label>
                  <input
                    type="text"
                    value={themeState.menuTitle}
                    onChange={(e) => setThemeState({ ...themeState, menuTitle: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">Menu Page Subtitle</label>
                  <input
                    type="text"
                    value={themeState.menuSubtitle}
                    onChange={(e) => setThemeState({ ...themeState, menuSubtitle: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 4: FAQ MANAGER */}
      {activeTab === 'faqs' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-[#E7E0D8] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E0D8] pb-4">
              <div>
                <h2 className="font-serif font-bold text-lg text-[#1C1917] flex items-center gap-2">
                  <HelpCircle size={18} className="text-[#B91C1C]" /> Manage Frequently Asked Questions
                </h2>
                <p className="text-xs text-[#57534E]">Add, edit, or delete FAQ items displayed on the public FAQ page.</p>
              </div>
              <button
                onClick={openCreateFaqModal}
                className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs self-start sm:self-auto"
              >
                <Plus size={15} /> Add New FAQ
              </button>
            </div>

            <div className="divide-y divide-[#E7E0D8]">
              {store.faqs.map((faq) => (
                <div key={faq.id} className="py-4 space-y-2 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FEF2F2] text-[#B91C1C] font-mono">
                        {faq.category}
                      </span>
                      <h4 className="font-serif font-bold text-[#1C1917] text-sm sm:text-base mt-1">
                        {faq.question}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditFaqModal(faq)}
                        className="p-1.5 text-[#57534E] hover:text-[#1C1917] hover:bg-[#FBF9F5] rounded transition-colors"
                        title="Edit FAQ"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteFaq(faq.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Delete FAQ"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}

              {store.faqs.length === 0 && (
                <div className="py-12 text-center text-[#A8A29E] text-xs">
                  No FAQs found. Click "Add New FAQ" to create one.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Button Bar */}
      <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E7E0D8]">
        <button
          onClick={handleSaveAll}
          className="btn btn-primary btn-lg flex items-center gap-2 shadow-lg"
        >
          <Save size={18} /> Save All Customizations
        </button>
      </div>

      {/* Add / Edit FAQ Modal */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8]">
            <div className="flex items-center justify-between border-b border-[#E7E0D8] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1C1917]">
                {editingFaq ? 'Edit FAQ Item' : 'Add New FAQ Item'}
              </h3>
              <button onClick={() => setShowFaqModal(false)} className="p-1 text-[#A8A29E] hover:text-[#1C1917]">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Category</label>
                <select
                  value={faqForm.category}
                  onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                  className="input-field bg-white"
                >
                  <option value="Ordering & Delivery">Ordering & Delivery</option>
                  <option value="Payments & Refunds">Payments & Refunds</option>
                  <option value="Food & Ingredients">Food & Ingredients</option>
                  <option value="General Questions">General Questions</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Question</label>
                <input
                  type="text"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                  placeholder="e.g. Do you deliver after 11 PM?"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">Answer</label>
                <textarea
                  rows={4}
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                  placeholder="Enter detailed answer..."
                  className="input-field"
                  required
                />
              </div>

              <div className="pt-3 border-t border-[#E7E0D8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFaqModal(false)}
                  className="btn btn-outline btn-sm text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm text-xs">
                  {editingFaq ? 'Update FAQ' : 'Create FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Library Modal */}
      <MediaLibraryModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        currentImage={themeState.heroImageUrl}
        title="Select Hero Featured Image"
        onSelect={(url) => {
          setThemeState((prev) => ({ ...prev, heroImageUrl: url }))
          toast.success('Hero image selected from library!')
        }}
      />
    </div>
  )
}
