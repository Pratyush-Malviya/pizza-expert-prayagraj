'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Send,
  RotateCcw,
  Save,
  Laptop,
  Smartphone,
  Copy,
  Sparkles,
  ExternalLink,
  Shield,
  Layers,
  Palette,
  Check,
  Search,
  Loader2,
} from 'lucide-react'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import { DEFAULT_EMAIL_TEMPLATES, SAMPLE_TEMPLATE_VALUES } from '@/lib/constants/defaultEmailTemplates'
import type { EmailTemplate } from '@/types/emailTemplate'
import { toast } from 'sonner'

const CATEGORIES = ['All', 'Orders', 'Delivery', 'Marketing', 'Alerts']

const PRESET_COLORS = [
  { label: 'Brick Red', hex: '#B91C1C' },
  { label: 'Neon Orange', hex: '#FF3B00' },
  { label: 'Amber Gold', hex: '#D97706' },
  { label: 'Fresh Green', hex: '#15803D' },
  { label: 'Royal Purple', hex: '#9333EA' },
  { label: 'Deep Blue', hex: '#1D4ED8' },
  { label: 'Dark Slate', hex: '#1C1917' },
]

export default function EmailTemplateManager() {
  const storeSettings = useSettingsStore()
  const { emailTemplates, updateEmailTemplate, resetEmailTemplates, businessName, adminEmail, logoDataUrl } = storeSettings

  const templates = emailTemplates && emailTemplates.length > 0 ? emailTemplates : DEFAULT_EMAIL_TEMPLATES

  const [selectedId, setSelectedId] = useState<string>(templates[0]?.id || 'order_confirmation')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [testEmailAddress, setTestEmailAddress] = useState<string>(adminEmail || 'malviya.pratyush26@gmail.com')
  const [sendingTest, setSendingTest] = useState<boolean>(false)
  const [copiedVar, setCopiedVar] = useState<string | null>(null)

  // Current editing template
  const currentTemplate = templates.find((t) => t.id === selectedId) || templates[0]

  const filteredTemplates = templates.filter((t) => {
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesSearch
  })

  const handleUpdate = (field: keyof EmailTemplate, val: any) => {
    if (!currentTemplate) return
    updateEmailTemplate(currentTemplate.id, { [field]: val })
  }

  const handleInsertVariable = (variable: string) => {
    if (!currentTemplate) return
    handleUpdate('bodyText', `${currentTemplate.bodyText} ${variable}`)
    setCopiedVar(variable)
    toast.success(`Inserted ${variable} into body text`)
    setTimeout(() => setCopiedVar(null), 2000)
  }

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      toast.error('Please enter a valid recipient email address.')
      return
    }

    setSendingTest(true)
    try {
      const res = await fetch('/api/admin/email-templates/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: currentTemplate,
          targetEmail: testEmailAddress,
          businessName: businessName || 'Pizza Expert',
          logoUrl: logoDataUrl || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch test email')
      }

      toast.success(`Test email sent to ${testEmailAddress}!`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test email. Verify RESEND_API_KEY.')
    } finally {
      setSendingTest(false)
    }
  }

  const handleResetToDefault = () => {
    const defaultOne = DEFAULT_EMAIL_TEMPLATES.find((t) => t.id === currentTemplate.id)
    if (defaultOne) {
      updateEmailTemplate(currentTemplate.id, defaultOne)
      toast.success(`Reset "${currentTemplate.name}" to default copy.`)
    }
  }

  // Render variables inside string for live preview
  const replaceMockVars = (text: string) => {
    let res = text || ''
    const values = {
      ...SAMPLE_TEMPLATE_VALUES,
      '{{businessName}}': businessName || 'Pizza Expert Prayagraj',
    }
    Object.entries(values).forEach(([k, v]) => {
      res = res.replaceAll(k, v)
    })
    return res
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E0D8] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEF2F2] border border-[#FCA5A5] text-[#B91C1C] text-xs font-bold font-mono uppercase mb-2">
            <Mail size={13} />
            Transactional & Marketing Emails
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#1C1917]">
            Email Template Management
          </h2>
          <p className="text-xs sm:text-sm text-[#57534E] max-w-2xl mt-1">
            Customize subjects, branding colors, call-to-actions, and messaging for all customer receipts, delivery milestones, abandoned cart recoveries, and kitchen alerts.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => {
              resetEmailTemplates()
              toast.success('All email templates restored to default.')
            }}
            className="btn btn-secondary text-xs rounded-xl px-4 py-2.5 flex items-center gap-1.5 flex-1 sm:flex-initial justify-center"
            title="Reset all templates to default"
          >
            <RotateCcw size={14} />
            <span>Reset All</span>
          </button>

          <button
            onClick={() => toast.success('All email templates saved successfully!')}
            className="btn btn-primary text-xs rounded-xl px-5 py-2.5 flex items-center gap-1.5 flex-1 sm:flex-initial justify-center shadow-md shadow-[#B91C1C]/20"
          >
            <Save size={14} />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Template Selector (Left) + Editor / Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Template List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Category Filter Pills */}
          <div className="bg-white rounded-2xl p-3 border border-[#E7E0D8] space-y-3 shadow-xs">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#1C1917] placeholder-zinc-400 focus:outline-none focus:border-[#B91C1C]"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#B91C1C] text-white shadow-xs'
                      : 'bg-[#FBF9F5] text-[#57534E] hover:bg-[#F3EFEA]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Template Cards List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredTemplates.map((tmpl) => {
              const isSelected = tmpl.id === selectedId
              return (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedId(tmpl.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#B91C1C] ring-2 ring-[#B91C1C]/15 shadow-sm'
                      : 'bg-white border-[#E7E0D8] hover:border-[#D6D3D1] hover:bg-[#FBF9F5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: tmpl.bannerColor || '#B91C1C' }}
                      />
                      <span className="text-xs font-bold text-[#1C1917] truncate max-w-[180px]">
                        {tmpl.name}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        tmpl.enabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-zinc-100 text-zinc-500'
                      }`}
                    >
                      {tmpl.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#78716C] truncate font-mono">
                    {tmpl.subject}
                  </p>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#F3EFEA] text-[10px] text-[#A8A29E]">
                    <span className="font-semibold">{tmpl.category}</span>
                    <span>•</span>
                    <span>{tmpl.variables.length} Variables</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Column: Editor & Live Preview (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Action & Tab Switcher Bar */}
          <div className="bg-white rounded-2xl p-3 border border-[#E7E0D8] shadow-xs flex items-center justify-between flex-wrap gap-3">
            {/* View Switcher */}
            <div className="flex items-center bg-[#FBF9F5] p-1 rounded-xl border border-[#E7E0D8]">
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'editor'
                    ? 'bg-white text-[#B91C1C] shadow-xs'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                <Edit3 size={14} />
                <span>Template Editor</span>
              </button>

              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white text-[#B91C1C] shadow-xs'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                <Eye size={14} />
                <span>Live Preview</span>
              </button>
            </div>

            {/* Right Tools: Device Toggle (if preview) & Test Dispatcher */}
            <div className="flex items-center gap-2">
              {activeTab === 'preview' && (
                <div className="flex items-center bg-[#FBF9F5] p-1 rounded-xl border border-[#E7E0D8]">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded-lg text-xs transition-all ${
                      previewDevice === 'desktop' ? 'bg-white text-[#B91C1C] shadow-xs' : 'text-[#78716C]'
                    }`}
                    title="Desktop Preview"
                  >
                    <Laptop size={15} />
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded-lg text-xs transition-all ${
                      previewDevice === 'mobile' ? 'bg-white text-[#B91C1C] shadow-xs' : 'text-[#78716C]'
                    }`}
                    title="Mobile Preview"
                  >
                    <Smartphone size={15} />
                  </button>
                </div>
              )}

              <button
                onClick={handleResetToDefault}
                className="p-2 rounded-xl border border-[#E7E0D8] bg-[#FBF9F5] hover:bg-[#F3EFEA] text-[#78716C] hover:text-[#1C1917] transition-colors"
                title="Reset this template"
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>

          {/* TAB 1: Template Editor */}
          {activeTab === 'editor' && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7E0D8] shadow-xs space-y-5">
              
              {/* Top Row: Enabled toggle + Accent color picker */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E7E0D8]">
                <div>
                  <h3 className="font-serif font-black text-lg text-[#1C1917]">
                    {currentTemplate.name}
                  </h3>
                  <span className="text-xs text-[#78716C]">
                    Category: <strong>{currentTemplate.category}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Color Palette */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#78716C] mr-1">Accent:</span>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => handleUpdate('bannerColor', c.hex)}
                        style={{ backgroundColor: c.hex }}
                        className={`w-6 h-6 rounded-full border transition-transform ${
                          currentTemplate.bannerColor === c.hex
                            ? 'scale-125 border-white ring-2 ring-black'
                            : 'border-transparent hover:scale-110'
                        }`}
                        title={c.label}
                      />
                    ))}
                  </div>

                  {/* Enable Switch */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentTemplate.enabled}
                      onChange={(e) => handleUpdate('enabled', e.target.checked)}
                      className="rounded text-[#B91C1C] focus:ring-[#B91C1C] h-4 w-4"
                    />
                    <span className="text-xs font-bold text-[#1C1917]">Enabled</span>
                  </label>
                </div>
              </div>

              {/* Subject Line */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={currentTemplate.subject}
                  onChange={(e) => handleUpdate('subject', e.target.value)}
                  className="input-field"
                  placeholder="Subject line..."
                />
              </div>

              {/* Heading & Subheading */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                    Main Heading / Title
                  </label>
                  <input
                    type="text"
                    value={currentTemplate.heading}
                    onChange={(e) => handleUpdate('heading', e.target.value)}
                    className="input-field"
                    placeholder="Main Heading"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                    Subheading / Banner Badge
                  </label>
                  <input
                    type="text"
                    value={currentTemplate.subheading}
                    onChange={(e) => handleUpdate('subheading', e.target.value)}
                    className="input-field"
                    placeholder="Subheading"
                  />
                </div>
              </div>

              {/* Body Text */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                  Email Body Content
                </label>
                <textarea
                  rows={4}
                  value={currentTemplate.bodyText}
                  onChange={(e) => handleUpdate('bodyText', e.target.value)}
                  className="input-field resize-none leading-relaxed"
                  placeholder="Email body message..."
                />
              </div>

              {/* Dynamic Variables Inserter Chips */}
              <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1C1917] flex items-center gap-1.5">
                    <Sparkles size={13} className="text-[#FF3B00]" />
                    Available Dynamic Variables (Click to insert into body)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentTemplate.variables.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleInsertVariable(v)}
                      className="px-2.5 py-1 bg-white hover:bg-[#F3EFEA] border border-[#E7E0D8] text-[#1C1917] rounded-lg text-xs font-mono font-semibold transition-all hover:border-[#B91C1C] flex items-center gap-1 cursor-pointer"
                    >
                      <span>{v}</span>
                      {copiedVar === v ? <Check size={12} className="text-emerald-600" /> : <Copy size={11} className="text-[#78716C]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Button & CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                    Button Label
                  </label>
                  <input
                    type="text"
                    value={currentTemplate.buttonText}
                    onChange={(e) => handleUpdate('buttonText', e.target.value)}
                    className="input-field"
                    placeholder="e.g. Track Live Status"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                    Button Target Link
                  </label>
                  <input
                    type="text"
                    value={currentTemplate.buttonUrl}
                    onChange={(e) => handleUpdate('buttonUrl', e.target.value)}
                    className="input-field font-mono text-xs"
                    placeholder="{{trackingUrl}}"
                  />
                </div>
              </div>

              {/* Footer Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                  Footer Support Notice
                </label>
                <input
                  type="text"
                  value={currentTemplate.footerNote}
                  onChange={(e) => handleUpdate('footerNote', e.target.value)}
                  className="input-field"
                  placeholder="Support notes..."
                />
              </div>

              {/* Test Dispatch Bar */}
              <div className="pt-3 border-t border-[#E7E0D8] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FBF9F5] p-4 rounded-2xl">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#78716C] mb-1">
                    Send Live Test Email via Resend
                  </label>
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="your-email@gmail.com"
                    className="w-full bg-white border border-[#E7E0D8] rounded-xl px-3 py-2 text-xs text-[#1C1917]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={sendingTest}
                  className="btn btn-secondary text-xs rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 self-end sm:self-auto shrink-0 shadow-xs"
                >
                  {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{sendingTest ? 'Sending Test...' : 'Send Test Email'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Live HTML / Inbox Preview */}
          {activeTab === 'preview' && (
            <div className="bg-zinc-900 rounded-3xl p-4 sm:p-8 border border-zinc-800 shadow-inner flex items-center justify-center min-h-[500px]">
              <div
                className={`bg-white rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 transition-all ${
                  previewDevice === 'mobile' ? 'w-[375px]' : 'w-full max-w-[580px]'
                }`}
              >
                {/* Email Mockup Client Header */}
                <div className="bg-zinc-100 border-b border-zinc-200 px-4 py-2 flex items-center justify-between text-xs text-zinc-600 font-mono">
                  <div className="truncate max-w-[300px]">
                    <strong>Subject:</strong> {replaceMockVars(currentTemplate.subject)}
                  </div>
                  <span className="text-[10px] bg-zinc-200 px-2 py-0.5 rounded text-zinc-700">Inbox</span>
                </div>

                {/* Email Banner Header */}
                <div
                  style={{ backgroundColor: currentTemplate.bannerColor || '#B91C1C' }}
                  className="p-6 text-center text-white space-y-1"
                >
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white m-0">
                    {businessName ? businessName.toUpperCase() : 'PIZZA EXPERT PRAYAGRAJ'}
                  </h1>
                  <p className="text-xs font-bold text-white/90 m-0">
                    {replaceMockVars(currentTemplate.subheading)}
                  </p>
                </div>

                {/* Email Body */}
                <div className="p-6 sm:p-8 space-y-4 text-zinc-900 text-left">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 leading-snug">
                    {replaceMockVars(currentTemplate.heading)}
                  </h2>

                  <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
                    {replaceMockVars(currentTemplate.bodyText)}
                  </p>

                  {/* Sample Items Table if template supports it */}
                  {currentTemplate.variables.includes('{{itemsTable}}') && (
                    <div className="bg-[#FBF9F5] border border-[#E7E0D8] rounded-xl p-4 space-y-2">
                      <h4 className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider">
                        Sample Order Summary
                      </h4>
                      <table className="w-full text-xs">
                        <tbody>
                          <tr className="border-b border-zinc-200">
                            <td className="py-1.5 text-zinc-800">1x Farmhouse Supreme (Medium)</td>
                            <td className="py-1.5 text-right font-bold text-zinc-900">₹499.00</td>
                          </tr>
                          <tr className="border-b border-zinc-200">
                            <td className="py-1.5 text-zinc-800">1x Stuffed Garlic Breadsticks</td>
                            <td className="py-1.5 text-right font-bold text-zinc-900">₹150.00</td>
                          </tr>
                          <tr>
                            <td className="pt-2 font-bold text-zinc-900">Total Bill:</td>
                            <td
                              style={{ color: currentTemplate.bannerColor || '#B91C1C' }}
                              className="pt-2 text-right font-black text-sm"
                            >
                              ₹649.00
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* CTA Button */}
                  {currentTemplate.buttonText && (
                    <div className="text-center pt-3 pb-2">
                      <a
                        href={replaceMockVars(currentTemplate.buttonUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ backgroundColor: currentTemplate.bannerColor || '#B91C1C' }}
                        className="inline-block text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-md"
                      >
                        {replaceMockVars(currentTemplate.buttonText)} →
                      </a>
                    </div>
                  )}

                  {/* Footer Notice */}
                  {currentTemplate.footerNote && (
                    <p className="text-[11px] text-zinc-500 text-center pt-3 border-t border-zinc-200">
                      {replaceMockVars(currentTemplate.footerNote)}
                    </p>
                  )}
                </div>

                {/* Email Footer */}
                <div className="bg-zinc-100 p-3 text-center text-[10px] text-zinc-500 border-t border-zinc-200">
                  © {new Date().getFullYear()} {businessName || 'Pizza Expert Prayagraj'}. All rights reserved.<br />
                  Wood-Fired Pizzeria • Allapur, Prayagraj, UP 211006
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
