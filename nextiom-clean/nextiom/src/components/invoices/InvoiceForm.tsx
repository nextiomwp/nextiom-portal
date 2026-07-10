import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Printer, Save, ArrowLeft, BookTemplate, Download, X, FileText, Search, Pencil, Check } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/customSupabaseClient'
import {
  Invoice, InvoiceCurrency, InvoiceItem, InvoiceSettings,
  calcTotal, calcSubtotal, calcTotalDiscount, fmtCurrency, todayISO, dueDateISO,
  generateInvoiceNo, getInvoiceSettings,
  createInvoice, updateInvoice,
  getInvoicePayments, resolvePaymentMethod,
  calcTotalUSD, calcTotalLKR,
  calcTotalDiscountUSD, calcTotalDiscountLKR,
} from '@/lib/invoices'
import { getCustomers, getCustomerByEmail, addNotification } from '@/lib/storage'

function newItem(): InvoiceItem {
  return {
    description: '',
    qty: 1,
    unit_price: 0,
    discount: 0,
    unit_price_usd: 0,
    unit_price_lkr: 0,
    amount_usd: 0,
    amount_lkr: 0,
  }
}

function recalcItemAmounts(item: InvoiceItem, cur: InvoiceCurrency, rate: number): InvoiceItem {
  const q = parseFloat(item.qty as any) || 0
  const disc = parseFloat(item.discount as any) || 0
  
  let priceUsd = item.unit_price_usd
  let priceLkr = item.unit_price_lkr

  if (cur === 'USD') {
    if (priceUsd === null || priceUsd === undefined || priceUsd === 0) {
      priceUsd = item.unit_price ?? 0
    }
    if (priceLkr === null || priceLkr === undefined || priceLkr === 0) {
      priceLkr = rate > 0 ? Number((priceUsd * rate).toFixed(2)) : 0
    }
  } else {
    // cur === 'LKR'
    if (priceLkr === null || priceLkr === undefined || priceLkr === 0) {
      priceLkr = item.unit_price ?? 0
    }
    if (priceUsd === null || priceUsd === undefined || priceUsd === 0) {
      priceUsd = rate > 0 ? Number((priceLkr / rate).toFixed(2)) : 0
    }
  }

  const discUsd = cur === 'USD' ? disc : (rate > 0 ? disc / rate : 0)
  const discLkr = cur === 'LKR' ? disc : (rate > 0 ? disc * rate : 0)

  const amtUsd = Number((q * priceUsd - discUsd).toFixed(2))
  const amtLkr = Number((q * priceLkr - discLkr).toFixed(2))

  return {
    ...item,
    unit_price_usd: priceUsd,
    unit_price_lkr: priceLkr,
    amount_usd: amtUsd,
    amount_lkr: amtLkr,
    unit_price: cur === 'USD' ? priceUsd : priceLkr
  }
}

function calculateDueDate(dateStr: string): string {
  if (!dateStr) return ''
  const [yr, mo, dy] = dateStr.split('-').map(Number)
  const d = new Date(yr, mo - 1, dy)
  d.setDate(d.getDate() + 7)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── Template helpers (localStorage) ────────────────────────────────────────

const TEMPLATE_KEY = 'nxt_invoice_templates'

export interface InvoiceTemplate {
  id: string
  name: string
  items: InvoiceItem[]
  createdAt: string
}

function loadTemplates(): InvoiceTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveTemplates(templates: InvoiceTemplate[]): void {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates))
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  c: any
  isDark: boolean
  existing?: Invoice
  onBack: () => void
}

export default function InvoiceForm({ c, isDark, existing, onBack }: Props) {
  const { toast } = useToast()
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches
  })

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)')
    const listener = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])
  const [settings, setSettings] = useState<InvoiceSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [invoiceNo, setInvoiceNo] = useState('')
  const [autoInvoiceNo, setAutoInvoiceNo] = useState('')
  const [isManual, setIsManual] = useState(false)
  const [invoiceDate, setInvoiceDate] = useState(todayISO())
  const [dueDate, setDueDate] = useState<string | null>(calculateDueDate(todayISO()))
  const [hasDueDate, setHasDueDate] = useState(true)
  const [status, setStatus] = useState<Invoice['status']>('unpaid')
  const [currency, setCurrency] = useState<InvoiceCurrency>('LKR')
  const [exchangeRate, setExchangeRate] = useState<string>('')
  const [clientName, setClientName] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([newItem()])
  const [notes, setNotes] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [allCustomers, setAllCustomers] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const nameRef = useRef<HTMLDivElement>(null)

  // Template modal state
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [showImportTemplate, setShowImportTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([])
  const [templateSearch, setTemplateSearch] = useState('')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [editingTemplateName, setEditingTemplateName] = useState('')
  const [paymentMethodText, setPaymentMethodText] = useState('')

  // Synchronize invoice templates between localStorage and Supabase user_metadata
  const syncTemplates = async (updated: InvoiceTemplate[]) => {
    saveTemplates(updated)
    setTemplates(updated)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            nxt_invoice_templates: updated
          }
        })
      }
    } catch (err) {
      console.error('Failed to sync templates to Supabase user_metadata:', err)
    }
  }

  useEffect(() => {
    const local = loadTemplates()
    setTemplates(local)

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.user_metadata?.nxt_invoice_templates) {
        const cloud = user.user_metadata.nxt_invoice_templates as InvoiceTemplate[]
        const combinedMap = new Map<string, InvoiceTemplate>()
        local.forEach(t => combinedMap.set(t.id, t))
        cloud.forEach(t => combinedMap.set(t.id, t))
        const merged = Array.from(combinedMap.values())
        if (JSON.stringify(local) !== JSON.stringify(merged)) {
          saveTemplates(merged)
          setTemplates(merged)
        }
      }
    }).catch(err => {
      console.error('Failed to load templates from Supabase user_metadata:', err)
    })
  }, [])

  useEffect(() => {
    if (existing?.id && status === 'paid') {
      getInvoicePayments(existing.id)
        .then(payments => {
          setPaymentMethodText(resolvePaymentMethod(payments))
        })
        .catch(err => console.error('Error fetching payments:', err))
    } else {
      setPaymentMethodText('')
    }
  }, [existing?.id, status])

  useEffect(() => {
    getCustomers().then(data => setAllCustomers(data || []))
    const handler = (e: MouseEvent) => {
      if (nameRef.current && !nameRef.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNameChange = (value: string) => {
    setClientName(value)
    if (value.trim().length < 1) { setSuggestions([]); setShowSuggestions(false); return }
    const q = value.toLowerCase()
    const matches = allCustomers.filter(cu => cu.name?.toLowerCase().includes(q) || cu.email?.toLowerCase().includes(q))
    setSuggestions(matches.slice(0, 6))
    setShowSuggestions(matches.length > 0)
  }

  const selectCustomer = (cu: any) => {
    setClientName(cu.name || '')
    setClientCompany(cu.company || '')
    setClientPhone(cu.phone || '')
    setClientEmail(cu.email || '')
    setClientAddress([cu.address, cu.country].filter(Boolean).join(', ') || '')
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleManualToggle = async (checked: boolean) => {
    setIsManual(checked)
    if (!checked) {
      if (existing) {
        setInvoiceNo(existing.invoice_no)
      } else {
        if (autoInvoiceNo) {
          setInvoiceNo(autoInvoiceNo)
        } else {
          const no = await generateInvoiceNo()
          setAutoInvoiceNo(no)
          setInvoiceNo(no)
        }
      }
    }
  }

  useEffect(() => {
    async function init() {
      const s = await getInvoiceSettings()
      setSettings(s)
      if (existing) {
        setInvoiceNo(existing.invoice_no)
        setInvoiceDate(existing.invoice_date)
        if (existing.due_date) {
          setHasDueDate(true)
          setDueDate(existing.due_date.split('T')[0])
        } else {
          setHasDueDate(false)
          setDueDate(calculateDueDate(existing.invoice_date))
        }
        setStatus(existing.status)
        setCurrency(existing.currency ?? 'LKR')
        setExchangeRate(existing.exchange_rate ? String(existing.exchange_rate) : '')
        setClientName(existing.client_name)
        setClientCompany(existing.client_company ?? '')
        setClientPhone(existing.client_phone ?? '')
        setClientEmail(existing.client_email ?? '')
        setClientAddress(existing.client_address ?? '')
        setItems(existing.items?.length ? existing.items : [newItem()])
        setNotes(existing.notes ?? '')
        setServiceName(existing.service_name ?? '')
      } else {
        const no = await generateInvoiceNo()
        setAutoInvoiceNo(no)
        setInvoiceNo(no)
        setNotes(s.default_notes)
        setHasDueDate(true)
        setDueDate(calculateDueDate(todayISO()))
      }
    }
    init()
  }, [existing])

   const subtotal = calcSubtotal(items)
  const totalDiscount = calcTotalDiscount(items)
  const total = calcTotal(items)

  const handleExchangeRateChange = (newRateStr: string) => {
    setExchangeRate(newRateStr)
    const rate = parseFloat(newRateStr) || 0
    if (rate > 0) {
      setItems(prev => prev.map(item => {
        let updated = { ...item }
        
        // Recalculate based on primary currency
        if (currency === 'USD') {
          if (updated.unit_price_usd !== undefined && updated.unit_price_usd !== null) {
            updated.unit_price_lkr = Number((updated.unit_price_usd * rate).toFixed(2))
          }
        } else {
          if (updated.unit_price_lkr !== undefined && updated.unit_price_lkr !== null) {
            updated.unit_price_usd = Number((updated.unit_price_lkr / rate).toFixed(2))
          }
        }

        return recalcItemAmounts(updated, currency, rate)
      }))
    }
  }

  const updateItem = useCallback((index: number, field: string, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      let updated = { ...item, [field]: value }

      const rate = parseFloat(exchangeRate) || 0

      if (field === 'qty') {
        updated.qty = parseFloat(value) || 0
      } else if (field === 'unit_price_usd') {
        const val = parseFloat(value) || 0
        updated.unit_price_usd = val
        if (rate > 0) {
          updated.unit_price_lkr = Number((val * rate).toFixed(2))
        }
      } else if (field === 'unit_price_lkr') {
        const val = parseFloat(value) || 0
        updated.unit_price_lkr = val
        if (rate > 0) {
          updated.unit_price_usd = Number((val / rate).toFixed(2))
        }
      } else if (field === 'discount') {
        updated.discount = parseFloat(value) || 0
      }

      return recalcItemAmounts(updated, currency, rate)
    }))
  }, [exchangeRate, currency])

  useEffect(() => {
    const rate = parseFloat(exchangeRate) || 0
    setItems(prev => prev.map(item => recalcItemAmounts(item, currency, rate)))
  }, [currency, exchangeRate])

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      setItems(prev => prev.map((item, i) => {
        if (i === index) {
          if (item.link_url === undefined) {
            return { ...item, link_url: '' }
          } else {
            const updated = { ...item }
            delete updated.link_url
            return updated
          }
        }
        return item
      }))
    }
  }

  const handleSave = async () => {
    if (!clientName.trim()) { toast({ title: 'Client name is required', variant: 'destructive' }); return }
    if (!items.some(i => i.description.trim())) { toast({ title: 'Add at least one line item', variant: 'destructive' }); return }
    setSaving(true)
    const validItems = items.filter(i => i.description.trim())
    const isLKR = currency === 'LKR'
    const processedItems = validItems.map(item => {
      if (!isLKR) {
        return {
          ...item,
          unit_price_lkr: null,
          amount_lkr: null,
        }
      }
      return item
    })
    const invoiceData: Invoice = {
      invoice_no: invoiceNo, invoice_date: invoiceDate, due_date: hasDueDate ? dueDate : null, status, currency,
      client_name: clientName, client_company: clientCompany, client_phone: clientPhone,
      client_email: clientEmail, client_address: clientAddress, notes, total,
      service_name: serviceName,
      exchange_rate: isLKR && exchangeRate ? parseFloat(exchangeRate) : null,
      total_usd: calcTotalUSD(processedItems, currency, isLKR ? (parseFloat(exchangeRate) || 0) : 0),
      total_lkr: isLKR ? calcTotalLKR(processedItems, currency, parseFloat(exchangeRate) || 0) : null,
    }
    try {
      if (existing?.id) {
        await updateInvoice(existing.id, invoiceData, processedItems)
        toast({ title: `Invoice ${invoiceNo} updated` })
      } else {
        await createInvoice(invoiceData, processedItems)
        toast({ title: `Invoice ${invoiceNo} saved` })
        // Notify the customer
        if (clientEmail) {
          const customer = await getCustomerByEmail(clientEmail).catch(() => null)
          if (customer?.id) {
            const notificationMsg = hasDueDate && dueDate
              ? `You have a new invoice of ${fmtCurrency(total, currency)} due by ${dueDate}. Please check your Invoices section.`
              : `You have a new invoice of ${fmtCurrency(total, currency)}. Please check your Invoices section.`
            addNotification({
              customer_id: customer.id,
              type: 'invoice',
              title: `New invoice — ${invoiceNo}`,
              message: notificationMsg,
            }).catch(() => {})

            // Send SMS if enabled
            try {
              const { getSmsSettings, sendSms } = await import('@/lib/sms')
              const smsSettings = await getSmsSettings()
              if (smsSettings?.sms_enabled && smsSettings?.invoice_sms) {
                const targetPhone = clientPhone?.trim() || customer.phone
                if (targetPhone) {
                  const smsMsg = `Dear ${clientName || 'Customer'}, a new invoice (${invoiceNo}) has been created for ${fmtCurrency(total, currency)}.` +
                    (hasDueDate && dueDate ? ` Due date: ${dueDate}.` : '') +
                    ` Please log in to your Nextiom portal to view and pay. – Team Nextiom`
                  await sendSms({
                    phone: targetPhone,
                    message: smsMsg,
                    type: 'invoice_created',
                    customerId: customer.id
                  })
                }
              }
            } catch (smsErr) {
              console.error('Failed to send invoice creation SMS:', smsErr)
            }
          }
        }
      }
      onBack()
    } catch { toast({ title: 'Failed to save invoice', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  const handlePrint = () => {
    if (!clientName.trim()) { toast({ title: 'Fill in client name before printing', variant: 'destructive' }); return }
    const validItems = items.filter(i => i.description.trim())
    const isLKR = currency === 'LKR'
    const processedItems = validItems.map(item => {
      if (!isLKR) {
        return {
          ...item,
          unit_price_lkr: null,
          amount_lkr: null,
        }
      }
      return item
    })
    localStorage.setItem('nxt_invoice_print', JSON.stringify({
      id: existing?.id,
      invoice_no: invoiceNo, invoice_date: invoiceDate, due_date: hasDueDate ? dueDate : null, status, currency,
      client_name: clientName, client_company: clientCompany, client_phone: clientPhone,
      client_email: clientEmail, client_address: clientAddress,
      items: processedItems.map(i => ({
        ...i,
        refunded: i.refunded ?? false
      })),
      notes, total, settings,
      service_name: serviceName,
      refunded_amount: existing?.refunded_amount || 0,
      refund_date: existing?.refund_date || null,
      refund_reason: existing?.refund_reason || null,
      refund_service_charge: existing?.refund_service_charge || 0,
      paid_amount: existing?.paid_amount || 0,
      exchange_rate: isLKR && exchangeRate ? parseFloat(exchangeRate) : null,
      total_usd: calcTotalUSD(processedItems, currency, isLKR ? (parseFloat(exchangeRate) || 0) : 0),
      total_lkr: isLKR ? calcTotalLKR(processedItems, currency, parseFloat(exchangeRate) || 0) : null,
    }))
    window.open('/invoices/print', '_blank')
  }

  const handleSaveTemplate = () => {
    const validItems = items.filter(i => i.description.trim())
    if (!validItems.length) {
      toast({ title: 'Add at least one line item to save as template', variant: 'destructive' })
      return
    }
    setTemplateName('')
    setShowSaveTemplate(true)
  }

  const confirmSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({ title: 'Template name is required', variant: 'destructive' })
      return
    }
    const validItems = items.filter(i => i.description.trim()).map(({ id: _id, invoice_id: _inv, ...rest }) => rest)
    const tpl: InvoiceTemplate = {
      id: `tpl_${Date.now()}`,
      name: templateName.trim(),
      items: validItems,
      createdAt: new Date().toISOString(),
    }
    const updated = [...loadTemplates(), tpl]
    syncTemplates(updated)
    setShowSaveTemplate(false)
    setTemplateName('')
    toast({ title: `Template "${tpl.name}" saved` })
  }

  const handleImportTemplate = () => {
    setTemplates(loadTemplates())
    setShowImportTemplate(true)
  }

  const applyTemplate = (tpl: InvoiceTemplate) => {
    const imported = tpl.items.length
      ? tpl.items.map(item => ({
          description: item.description,
          qty: 1,
          unit_price: 0,
          discount: 0,
          is_package: item.is_package || false,
          sub_items: item.sub_items || [],
          ...(item.link_url !== undefined ? { link_url: item.link_url } : {})
        }))
      : [newItem()]
    setItems(imported)
    setShowImportTemplate(false)
    toast({ title: `Template "${tpl.name}" imported` })
  }

  const deleteTemplate = (id: string) => {
    const updated = loadTemplates().filter(t => t.id !== id)
    syncTemplates(updated)
  }

  const startRenameTemplate = (tpl: InvoiceTemplate) => {
    setEditingTemplateId(tpl.id)
    setEditingTemplateName(tpl.name)
  }

  const confirmRenameTemplate = () => {
    if (!editingTemplateId || !editingTemplateName.trim()) return
    const updated = loadTemplates().map(t =>
      t.id === editingTemplateId ? { ...t, name: editingTemplateName.trim() } : t
    )
    syncTemplates(updated)
    setEditingTemplateId(null)
    setEditingTemplateName('')
    toast({ title: 'Template renamed' })
  }

  const card: React.CSSProperties = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: c.subText, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }
  const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: `1px solid ${c.borderStrong}`, borderRadius: 8, color: c.text, fontSize: 13, background: isDark ? '#22252C' : '#fff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
  const secTitle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: c.text }}>
              {existing ? `Edit — ${invoiceNo}` : 'New invoice'}
            </h2>
            <p style={{ fontSize: 13, color: c.subText, marginTop: 2 }}>
              {existing ? 'Update invoice details and line items' : 'Create a new invoice for a client'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <button
            onClick={handleSaveTemplate}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', border: `1px solid ${c.border}`, background: c.card, color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', flex: isMobile ? 1 : 'none' }}
            title="Save current line items as a reusable template"
          >
            <BookTemplate size={15} /> {!isMobile && 'Save as Template'}
          </button>
          <button
            onClick={handleImportTemplate}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', border: `1px solid ${c.border}`, background: c.card, color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', flex: isMobile ? 1 : 'none' }}
            title="Import line items from a saved template"
          >
            <Download size={15} /> {!isMobile && 'Import Template'}
          </button>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', border: `1px solid ${c.border}`, background: c.card, color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', flex: isMobile ? 1 : 'none' }}>
            <Printer size={15} /> {!isMobile && 'Print / PDF'}
          </button>
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', background: c.brand, color: '#fff', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', opacity: saving ? 0.7 : 1, flex: isMobile ? 1.5 : 'none' }}>
            <Save size={15} /> {saving ? 'Saving…' : existing ? 'Update' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* Left column */}
        <div>
          {/* Invoice details */}
          <div style={card}>
            <p style={secTitle}>Invoice details</p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>Invoice no.</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: c.subText, cursor: 'pointer', textTransform: 'uppercase', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={isManual}
                      onChange={e => handleManualToggle(e.target.checked)}
                      style={{ cursor: 'pointer', margin: 0 }}
                    />
                    Manual
                  </label>
                </div>
                <input
                  style={isManual ? inp : { ...inp, background: isDark ? '#1C1E24' : '#f0f0f0', color: c.subText }}
                  value={invoiceNo}
                  onChange={e => isManual && setInvoiceNo(e.target.value)}
                  readOnly={!isManual}
                />
              </div>
              <div>
                <label style={lbl}>Invoice date</label>
                <input
                  type="date"
                  style={inp}
                  value={invoiceDate}
                  onChange={e => {
                    const nextVal = e.target.value
                    setInvoiceDate(nextVal)
                    if (nextVal) {
                      setDueDate(calculateDueDate(nextVal))
                    }
                  }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>Due date</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: c.subText, cursor: 'pointer', textTransform: 'uppercase', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={hasDueDate}
                      onChange={e => {
                        const checked = e.target.checked
                        setHasDueDate(checked)
                        if (checked && invoiceDate) {
                          setDueDate(calculateDueDate(invoiceDate))
                        }
                      }}
                      style={{ cursor: 'pointer', margin: 0 }}
                    />
                    Enable
                  </label>
                </div>
                <input
                  type="date"
                  style={hasDueDate ? inp : { ...inp, background: isDark ? '#1C1E24' : '#f0f0f0', color: c.subText }}
                  value={hasDueDate ? (dueDate || '') : ''}
                  onChange={e => hasDueDate && setDueDate(e.target.value)}
                  disabled={!hasDueDate}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '120px 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Status</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={status} onChange={e => setStatus(e.target.value as Invoice['status'])}>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="ongoing">On Going</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Service Name</label>
                <input style={inp} placeholder="e.g. Web Development, Hosting" value={serviceName} onChange={e => setServiceName(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Client info */}
          <div style={card}>
            <p style={secTitle}>Bill to</p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div ref={nameRef} style={{ position: 'relative' }}>
                <label style={lbl}>Client name *</label>
                <input style={inp} placeholder="Type name to search customers…" value={clientName} onChange={e => handleNameChange(e.target.value)} autoComplete="off" />
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, background: isDark ? '#22252C' : '#fff', border: `1px solid ${c.border}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', marginTop: 2, maxHeight: 220, overflowY: 'auto' }}>
                    {suggestions.map((cu: any) => (
                      <div key={cu.id} onMouseDown={() => selectCustomer(cu)}
                        style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: 2 }}
                        onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : '#f5f5f5')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{cu.name}</span>
                        <span style={{ fontSize: 11, color: c.subText }}>{cu.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div><label style={lbl}>Company</label><input style={inp} placeholder="Company (optional)" value={clientCompany} onChange={e => setClientCompany(e.target.value)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><label style={lbl}>Phone</label><input style={inp} placeholder="+94 7x xxx xxxx" value={clientPhone} onChange={e => setClientPhone(e.target.value)} /></div>
              <div><label style={lbl}>Email</label><input type="email" style={inp} placeholder="email@example.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} /></div>
            </div>
            <div>
              <label style={lbl}>Address</label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 60 }} placeholder="Street, city" value={clientAddress} onChange={e => setClientAddress(e.target.value)} rows={2} />
            </div>
          </div>

          {/* Notes */}
          <div style={card}>
            <p style={secTitle}>Notes / payment terms</p>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 80 }} value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Payment terms, conditions…" />
          </div>
        </div>

        {/* Right column — line items */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <p style={{ ...secTitle, marginBottom: 0 }}>Line items</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {currency === 'LKR' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: c.subText }}>
                  <span style={{ fontWeight: 600 }}>1 USD = LKR</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{
                      ...inp,
                      width: 80,
                      height: 28,
                      padding: '2px 8px',
                      fontSize: 12,
                      textAlign: 'center',
                      fontWeight: 600,
                      borderColor: c.brand,
                    }}
                    placeholder="Rate"
                    value={exchangeRate}
                    onChange={e => handleExchangeRateChange(e.target.value)}
                  />
                </div>
              )}
              <div style={{ display: 'flex', padding: 3, border: `1px solid ${c.border}`, borderRadius: 8, background: isDark ? '#1C1E24' : '#f8fafc' }}>
                {(['LKR', 'USD'] as InvoiceCurrency[]).map(cur => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setCurrency(cur)}
                    style={{
                      minWidth: 48,
                      padding: '6px 10px',
                      border: 'none',
                      borderRadius: 6,
                      background: currency === cur ? c.brand : 'transparent',
                      color: currency === cur ? '#fff' : c.subText,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: 'inherit',
                    }}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!isMobile && (
            currency === 'LKR' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 54px 105px 80px 105px 28px', gap: 6, padding: '0 2px 6px', fontSize: 11, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <span>Description</span>
                <span style={{ textAlign: 'center' }}>Qty</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span>Unit Price</span>
                  <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.7, marginTop: 2 }}>LKR / USD</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span>Discount</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span>Amount</span>
                  <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.7, marginTop: 2 }}>LKR / USD</span>
                </div>
                <span></span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 54px 105px 80px 105px 28px', gap: 6, padding: '0 2px 6px', fontSize: 11, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <span>Description</span>
                <span style={{ textAlign: 'center' }}>Qty</span>
                <span style={{ textAlign: 'right', paddingRight: 10 }}>Unit Price</span>
                <span style={{ textAlign: 'right', paddingRight: 10 }}>Discount</span>
                <span style={{ textAlign: 'right', paddingRight: 10 }}>Amount</span>
                <span></span>
              </div>
            )
          )}

          <div style={{ marginBottom: 10 }}>
            {items.map((item, i) => (
              isMobile ? (
                <div key={i} style={{ 
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', 
                  border: `1px solid ${c.border}`, 
                  borderRadius: 10, 
                  padding: 12, 
                  marginBottom: 12, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 10 
                }}>
                  {/* Top: Description field & Delete button */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={lbl}>Description</label>
                      <input
                        style={inp}
                        placeholder={item.is_package ? "Package name" : "Service or product (Shift+Enter for link)"}
                        value={item.description}
                        onChange={e => updateItem(i, 'description', e.target.value)}
                        onKeyDown={e => handleDescriptionKeyDown(e, i)}
                      />
                      {item.link_url !== undefined && (
                        <input
                          style={{ ...inp, fontSize: 11, padding: '4px 8px' }}
                          placeholder="Enter link URL (e.g. https://...)"
                          value={item.link_url || ''}
                          onChange={e => updateItem(i, 'link_url', e.target.value)}
                        />
                      )}
                      {item.is_package && (
                        <div style={{ paddingLeft: 12, borderLeft: `2px solid ${c.brand}`, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sub-items</span>
                          {(item.sub_items || []).map((sub, subIdx) => (
                            <div key={subIdx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <input
                                style={{ ...inp, padding: '4px 8px', fontSize: 12, border: `1px solid ${c.border}` }}
                                placeholder={`Sub-item ${subIdx + 1} description`}
                                value={sub}
                                onChange={e => {
                                  const newSubs = [...(item.sub_items || [])]
                                  newSubs[subIdx] = e.target.value
                                  updateItem(i, 'sub_items', newSubs)
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newSubs = (item.sub_items || []).filter((_, sIdx) => sIdx !== subIdx)
                                  updateItem(i, 'sub_items', newSubs)
                                }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newSubs = [...(item.sub_items || []), '']
                              updateItem(i, 'sub_items', newSubs)
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: c.brand, cursor: 'pointer', fontSize: 11, padding: '2px 0', alignSelf: 'flex-start', fontWeight: 600 }}
                          >
                            <Plus size={10} /> Add Sub-item
                          </button>
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeItem(i)} disabled={items.length === 1} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: items.length === 1 ? 'not-allowed' : 'pointer', padding: 8, borderRadius: 6, opacity: items.length === 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', marginTop: 18 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Middle: Qty, Prices, Discounts, Amounts */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={lbl}>Qty</label>
                        <input type="number" min={1} style={{ ...inp, textAlign: 'center' }} value={item.qty} onChange={e => updateItem(i, 'qty', parseFloat(e.target.value) || 1)} />
                      </div>
                      <div>
                        <label style={lbl}>Discount</label>
                        <input type="number" min={0} placeholder="0" style={inp} value={item.discount || ''} onChange={e => updateItem(i, 'discount', parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    {currency === 'LKR' ? (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={lbl}>Unit Price (LKR)</label>
                            <input
                              type="number"
                              min={0}
                              placeholder="0.00"
                              style={inp}
                              value={item.unit_price_lkr !== undefined && item.unit_price_lkr !== null ? item.unit_price_lkr : ''}
                              onChange={e => updateItem(i, 'unit_price_lkr', e.target.value)}
                            />
                          </div>
                          <div>
                            <label style={lbl}>Unit Price (USD)</label>
                            <input
                              type="number"
                              min={0}
                              placeholder="0.00"
                              style={inp}
                              value={item.unit_price_usd !== undefined && item.unit_price_usd !== null ? item.unit_price_usd : ''}
                              onChange={e => updateItem(i, 'unit_price_usd', e.target.value)}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={lbl}>Amount (LKR)</label>
                            <input
                              type="number"
                              min={0}
                              placeholder="0.00"
                              style={inp}
                              value={item.amount_lkr !== undefined && item.amount_lkr !== null ? item.amount_lkr : ''}
                              onChange={e => updateItem(i, 'amount_lkr', e.target.value)}
                            />
                          </div>
                          <div>
                            <label style={lbl}>Amount (USD)</label>
                            <input
                              type="number"
                              min={0}
                              placeholder="0.00"
                              style={inp}
                              value={item.amount_usd !== undefined && item.amount_usd !== null ? item.amount_usd : ''}
                              onChange={e => updateItem(i, 'amount_usd', e.target.value)}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={lbl}>Unit Price (USD)</label>
                          <input
                            type="number"
                            min={0}
                            placeholder="0.00"
                            style={inp}
                            value={item.unit_price_usd !== undefined && item.unit_price_usd !== null ? item.unit_price_usd : ''}
                            onChange={e => updateItem(i, 'unit_price_usd', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={lbl}>Amount (USD)</label>
                          <input
                            type="number"
                            min={0}
                            placeholder="0.00"
                            style={inp}
                            value={item.amount_usd !== undefined && item.amount_usd !== null ? item.amount_usd : ''}
                            onChange={e => updateItem(i, 'amount_usd', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Subtotal Amount display */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: `1px dashed ${c.border}`, paddingTop: 8 }}>
                    {currency === 'LKR' ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: c.subText }}>Amount (LKR)</span>
                          <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>LKR {item.amount_lkr ? Number(item.amount_lkr).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: c.subText }}>Amount (USD)</span>
                          <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>USD {item.amount_usd ? Number(item.amount_usd).toFixed(2) : '0.00'}</div>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: c.subText }}>Amount</span>
                        <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>USD {item.amount_usd ? Number(item.amount_usd).toFixed(2) : '0.00'}</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                currency === 'LKR' ? (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 54px 105px 80px 105px 28px', gap: 6, alignItems: 'start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                      <input
                        style={inp}
                        placeholder={item.is_package ? "Package name" : "Service or product (Shift+Enter for link)"}
                        value={item.description}
                        onChange={e => updateItem(i, 'description', e.target.value)}
                        onKeyDown={e => handleDescriptionKeyDown(e, i)}
                      />
                      {item.link_url !== undefined && (
                        <input
                          style={{ ...inp, fontSize: 11, padding: '4px 8px' }}
                          placeholder="Enter link URL (e.g. https://...)"
                          value={item.link_url || ''}
                          onChange={e => updateItem(i, 'link_url', e.target.value)}
                        />
                      )}
                      {item.is_package && (
                        <div style={{ paddingLeft: 12, borderLeft: `2px solid ${c.brand}`, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sub-items</span>
                          {(item.sub_items || []).map((sub, subIdx) => (
                            <div key={subIdx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <input
                                style={{ ...inp, padding: '4px 8px', fontSize: 12, border: `1px solid ${c.border}` }}
                                placeholder={`Sub-item ${subIdx + 1} description`}
                                value={sub}
                                onChange={e => {
                                  const newSubs = [...(item.sub_items || [])]
                                  newSubs[subIdx] = e.target.value
                                  updateItem(i, 'sub_items', newSubs)
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newSubs = (item.sub_items || []).filter((_, sIdx) => sIdx !== subIdx)
                                  updateItem(i, 'sub_items', newSubs)
                                }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newSubs = [...(item.sub_items || []), '']
                              updateItem(i, 'sub_items', newSubs)
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: c.brand, cursor: 'pointer', fontSize: 11, padding: '2px 0', alignSelf: 'flex-start', fontWeight: 600 }}
                          >
                            <Plus size={10} /> Add Sub-item
                          </button>
                        </div>
                      )}
                    </div>
                    <input type="number" min={1} style={{ ...inp, textAlign: 'center' }} value={item.qty} onChange={e => updateItem(i, 'qty', parseFloat(e.target.value) || 1)} />
                    
                    {/* Unit Price LKR/USD vertical stack */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <input
                        type="number"
                        min={0}
                        placeholder="LKR"
                        style={inp}
                        value={item.unit_price_lkr !== undefined && item.unit_price_lkr !== null ? item.unit_price_lkr : ''}
                        onChange={e => updateItem(i, 'unit_price_lkr', e.target.value)}
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="USD"
                        style={{ ...inp, fontSize: 12, opacity: 0.8 }}
                        value={item.unit_price_usd !== undefined && item.unit_price_usd !== null ? item.unit_price_usd : ''}
                        onChange={e => updateItem(i, 'unit_price_usd', e.target.value)}
                      />
                    </div>

                    {/* Discount input (4th column) */}
                    <input type="number" min={0} placeholder="0" style={inp} value={item.discount || ''} onChange={e => updateItem(i, 'discount', parseFloat(e.target.value) || 0)} />

                    {/* Amount LKR/USD vertical stack (5th column) - READ-ONLY TEXT */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', justifyContent: 'center', minHeight: 32, paddingRight: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>
                        {item.amount_lkr ? Number(item.amount_lkr).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: c.subText }}>
                        {item.amount_usd ? Number(item.amount_usd).toFixed(2) : '0.00'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: 6 }}>
                      <button onClick={() => removeItem(i)} disabled={items.length === 1} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: items.length === 1 ? 'not-allowed' : 'pointer', padding: 2, borderRadius: 4, opacity: items.length === 1 ? 0.3 : 1, display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 54px 105px 80px 105px 28px', gap: 6, alignItems: 'start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                      <input
                        style={inp}
                        placeholder={item.is_package ? "Package name" : "Service or product (Shift+Enter for link)"}
                        value={item.description}
                        onChange={e => updateItem(i, 'description', e.target.value)}
                        onKeyDown={e => handleDescriptionKeyDown(e, i)}
                      />
                      {item.link_url !== undefined && (
                        <input
                          style={{ ...inp, fontSize: 11, padding: '4px 8px' }}
                          placeholder="Enter link URL (e.g. https://...)"
                          value={item.link_url || ''}
                          onChange={e => updateItem(i, 'link_url', e.target.value)}
                        />
                      )}
                      {item.is_package && (
                        <div style={{ paddingLeft: 12, borderLeft: `2px solid ${c.brand}`, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sub-items</span>
                          {(item.sub_items || []).map((sub, subIdx) => (
                            <div key={subIdx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <input
                                style={{ ...inp, padding: '4px 8px', fontSize: 12, border: `1px solid ${c.border}` }}
                                placeholder={`Sub-item ${subIdx + 1} description`}
                                value={sub}
                                onChange={e => {
                                  const newSubs = [...(item.sub_items || [])]
                                  newSubs[subIdx] = e.target.value
                                  updateItem(i, 'sub_items', newSubs)
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newSubs = (item.sub_items || []).filter((_, sIdx) => sIdx !== subIdx)
                                  updateItem(i, 'sub_items', newSubs)
                                }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newSubs = [...(item.sub_items || []), '']
                              updateItem(i, 'sub_items', newSubs)
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: c.brand, cursor: 'pointer', fontSize: 11, padding: '2px 0', alignSelf: 'flex-start', fontWeight: 600 }}
                          >
                            <Plus size={10} /> Add Sub-item
                          </button>
                        </div>
                      )}
                    </div>
                    <input type="number" min={1} style={{ ...inp, textAlign: 'center' }} value={item.qty} onChange={e => updateItem(i, 'qty', parseFloat(e.target.value) || 1)} />
                    
                    {/* Unit Price (USD) */}
                    <input
                      type="number"
                      min={0}
                      placeholder="0.00"
                      style={{ ...inp, textAlign: 'right' }}
                      value={item.unit_price_usd !== undefined && item.unit_price_usd !== null ? item.unit_price_usd : ''}
                      onChange={e => updateItem(i, 'unit_price_usd', e.target.value)}
                    />

                    {/* Discount input (4th column) */}
                    <input type="number" min={0} placeholder="0" style={inp} value={item.discount || ''} onChange={e => updateItem(i, 'discount', parseFloat(e.target.value) || 0)} />

                    {/* Amount (USD) - READ-ONLY TEXT */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minHeight: 32, paddingRight: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>
                        {item.amount_usd ? Number(item.amount_usd).toFixed(2) : '0.00'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: 6 }}>
                      <button onClick={() => removeItem(i)} disabled={items.length === 1} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: items.length === 1 ? 'not-allowed' : 'pointer', padding: 2, borderRadius: 4, opacity: items.length === 1 ? 0.3 : 1, display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              )
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setItems(p => [...p, newItem()])} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
              <Plus size={13} /> Add item
            </button>
            <button onClick={() => setItems(p => [...p, { ...newItem(), is_package: true, sub_items: [''] }])} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
              <Plus size={13} /> Add Package
            </button>
          </div>

          {/* Totals */}
          {currency === 'LKR' ? (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: c.subText }}>
                <span>Subtotal</span>
                <div style={{ display: 'flex', gap: 24, fontFamily: 'monospace' }}>
                  <span style={{ minWidth: 120, textAlign: 'right' }}>LKR {calcTotalLKR(items, currency, parseFloat(exchangeRate) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span style={{ minWidth: 100, textAlign: 'right' }}>USD {calcTotalUSD(items, currency, parseFloat(exchangeRate) || 0).toFixed(2)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: c.subText }}>
                <span>Total Discount</span>
                <div style={{ display: 'flex', gap: 24, fontFamily: 'monospace' }}>
                  <span style={{ minWidth: 120, textAlign: 'right' }}>LKR {calcTotalDiscountLKR(items, currency, parseFloat(exchangeRate) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span style={{ minWidth: 100, textAlign: 'right' }}>USD {calcTotalDiscountUSD(items, currency, parseFloat(exchangeRate) || 0).toFixed(2)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, borderTop: `1px solid ${c.border}`, paddingTop: 8, color: c.brand }}>
                <span>Grand Total</span>
                <div style={{ display: 'flex', gap: 24, fontFamily: 'monospace' }}>
                  <span style={{ minWidth: 120, textAlign: 'right' }}>LKR {calcTotalLKR(items, currency, parseFloat(exchangeRate) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span style={{ minWidth: 100, textAlign: 'right' }}>USD {calcTotalUSD(items, currency, parseFloat(exchangeRate) || 0).toFixed(2)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500, color: c.text }}>
                <span>Due Total</span>
                <div style={{ display: 'flex', gap: 24, fontFamily: 'monospace' }}>
                  <span style={{ minWidth: 120, textAlign: 'right' }}>LKR {calcTotalLKR(items, currency, parseFloat(exchangeRate) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span style={{ minWidth: 100, textAlign: 'right' }}>USD {calcTotalUSD(items, currency, parseFloat(exchangeRate) || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: c.subText }}>
                <span>Subtotal</span>
                <span style={{ fontFamily: 'monospace' }}>USD {calcTotalUSD(items, currency, 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: c.subText }}>
                <span>Total Discount</span>
                <span style={{ fontFamily: 'monospace' }}>USD {calcTotalDiscountUSD(items, currency, 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, borderTop: `1px solid ${c.border}`, paddingTop: 8, color: c.brand }}>
                <span>Grand Total</span>
                <span style={{ fontFamily: 'monospace' }}>USD {calcTotalUSD(items, currency, 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500, color: c.text }}>
                <span>Due Total</span>
                <span style={{ fontFamily: 'monospace' }}>USD {calcTotalUSD(items, currency, 0).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Payment preview */}
          {status === 'paid' && paymentMethodText ? (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${c.border}` }}>
              <p style={{ ...secTitle, marginBottom: 6 }}>Payment method</p>
              <div style={{ fontSize: 13, color: c.text, fontWeight: 600 }}>
                Payment Method - {paymentMethodText}
              </div>
            </div>
          ) : (settings?.bank_name && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${c.border}` }}>
              <p style={{ ...secTitle, marginBottom: 6 }}>Payment method</p>
              <div style={{ fontSize: 12, color: c.subText, lineHeight: 1.9 }}>
                <div>Bank Transfer ({currency})</div>
                <div>Name: {settings.account_name}</div>
                <div>Account: {settings.account_no}</div>
                <div>Bank: {settings.bank_name} · {settings.bank_branch}</div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* ── Save as Template Modal ─────────────────────────────────── */}
      {showSaveTemplate && (
        <>
          <div
            onClick={() => setShowSaveTemplate(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 400 }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 440, background: c.card, border: `1px solid ${c.border}`,
            borderRadius: 14, zIndex: 401, boxShadow: '0 16px 56px rgba(0,0,0,0.45)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <BookTemplate size={17} style={{ color: c.brand }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Save as Template</span>
              </div>
              <button onClick={() => setShowSaveTemplate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}><X size={17} /></button>
            </div>
            {/* Body */}
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: 12, color: c.subText, marginBottom: 14, lineHeight: 1.6 }}>
                Only the <strong style={{ color: c.text }}>line items</strong> from this invoice will be saved. You can import them later into any invoice.
              </p>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.subText, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Template Name</label>
              <input
                autoFocus
                placeholder="e.g. Web Development Package"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmSaveTemplate()}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${c.borderStrong}`, borderRadius: 8, color: c.text, fontSize: 13, background: isDark ? '#22252C' : '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <div style={{ marginTop: 10, fontSize: 12, color: c.subText }}>
                {items.filter(i => i.description.trim()).length} line item(s) will be saved
              </div>
            </div>
            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowSaveTemplate(false)} style={{ padding: '8px 16px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={confirmSaveTemplate} style={{ padding: '8px 20px', border: 'none', background: c.brand, color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>Save Template</button>
            </div>
          </div>
        </>
      )}

      {/* ── Import Template Modal ──────────────────────────────────── */}
      {showImportTemplate && (
        <>
          <div
            onClick={() => { setShowImportTemplate(false); setTemplateSearch(''); setEditingTemplateId(null) }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 400 }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 580, maxHeight: '82vh', background: c.card, border: `1px solid ${c.border}`,
            borderRadius: 14, zIndex: 401, boxShadow: '0 16px 56px rgba(0,0,0,0.45)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Download size={17} style={{ color: c.brand }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Import Template</span>
                <span style={{ fontSize: 12, color: c.subText, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderRadius: 20, padding: '2px 8px' }}>{templates.length}</span>
              </div>
              <button onClick={() => { setShowImportTemplate(false); setTemplateSearch(''); setEditingTemplateId(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}><X size={17} /></button>
            </div>

            {/* Search bar */}
            {templates.length > 0 && (
              <div style={{ padding: '12px 20px', borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.subText, pointerEvents: 'none' }} />
                  <input
                    autoFocus
                    placeholder="Search templates by name or item…"
                    value={templateSearch}
                    onChange={e => setTemplateSearch(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px 8px 30px', border: `1px solid ${c.borderStrong}`, borderRadius: 8, color: c.text, fontSize: 13, background: isDark ? '#22252C' : '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                  {templateSearch && (
                    <button onClick={() => setTemplateSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 2 }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Body */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              {(() => {
                const q = templateSearch.toLowerCase().trim()
                const filtered = q
                  ? templates.filter(t =>
                      t.name.toLowerCase().includes(q) ||
                      t.items.some(i => i.description.toLowerCase().includes(q))
                    )
                  : templates

                if (templates.length === 0) return (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <FileText size={40} style={{ color: c.subText, display: 'block', margin: '0 auto 12px' }} />
                    <p style={{ color: c.subText, fontSize: 13 }}>No templates saved yet.</p>
                    <p style={{ color: c.subText, fontSize: 12, marginTop: 4 }}>Use "Save as Template" on any invoice to create one.</p>
                  </div>
                )

                if (filtered.length === 0) return (
                  <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                    <Search size={32} style={{ color: c.subText, display: 'block', margin: '0 auto 10px' }} />
                    <p style={{ color: c.subText, fontSize: 13 }}>No templates match "{templateSearch}"</p>
                  </div>
                )

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filtered.map(tpl => (
                      <div key={tpl.id} style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden', background: isDark ? '#22252C' : '#fafafa' }}>
                        {/* Template header */}
                        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${c.border}`, gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {editingTemplateId === tpl.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input
                                  autoFocus
                                  value={editingTemplateName}
                                  onChange={e => setEditingTemplateName(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') confirmRenameTemplate(); if (e.key === 'Escape') setEditingTemplateId(null) }}
                                  style={{ flex: 1, padding: '5px 9px', border: `1.5px solid ${c.brand}`, borderRadius: 6, color: c.text, fontSize: 13, fontWeight: 700, background: isDark ? '#15161A' : '#fff', outline: 'none', fontFamily: 'inherit' }}
                                />
                                <button onClick={confirmRenameTemplate} style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', border: 'none', background: c.brand, color: '#fff', borderRadius: 6, cursor: 'pointer' }}>
                                  <Check size={13} />
                                </button>
                                <button onClick={() => setEditingTemplateId(null)} style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', border: `1px solid ${c.border}`, background: 'transparent', color: c.subText, borderRadius: 6, cursor: 'pointer' }}>
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.name}</div>
                                <button
                                  onClick={() => startRenameTemplate(tpl)}
                                  title="Rename template"
                                  style={{ display: 'flex', alignItems: 'center', padding: 4, border: 'none', background: 'none', color: c.subText, cursor: 'pointer', borderRadius: 4, flexShrink: 0 }}
                                  onMouseEnter={e => (e.currentTarget.style.color = c.brand)}
                                  onMouseLeave={e => (e.currentTarget.style.color = c.subText)}
                                >
                                  <Pencil size={12} />
                                </button>
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: c.subText, marginTop: 2 }}>
                              {tpl.items.length} item(s) · Saved {new Date(tpl.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button
                              onClick={() => deleteTemplate(tpl.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', border: `1px solid rgba(239,68,68,0.3)`, background: 'rgba(239,68,68,0.08)', color: '#ef4444', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                            <button
                              onClick={() => applyTemplate(tpl)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: 'none', background: c.brand, color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}
                            >
                              <Download size={12} /> Import
                            </button>
                          </div>
                        </div>
                        {/* Line items preview */}
                        <div style={{ padding: '10px 14px' }}>
                          {tpl.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '4px 0', borderBottom: idx < tpl.items.length - 1 ? `1px solid ${c.border}` : 'none', gap: 2 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, color: c.text, flex: 1, fontWeight: item.is_package ? 600 : 'normal' }}>{item.description}</span>
                                {item.link_url && <span style={{ fontSize: 11, color: c.brand }}>🔗</span>}
                              </div>
                              {item.is_package && item.sub_items && item.sub_items.length > 0 && (
                                <div style={{ paddingLeft: 12, fontSize: 10, color: c.subText, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  {item.sub_items.map((sub, sIdx) => (
                                    <span key={sIdx}>- {sub}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
