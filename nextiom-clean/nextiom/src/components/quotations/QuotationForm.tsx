// src/components/quotations/QuotationForm.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Printer, Save, ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  Quotation, QuotationItem, QuotationCurrency,
  calcTotal, fmtCurrency, todayISO, validityISO,
  generateQuotationNo, createQuotation, updateQuotation
} from '@/lib/quotations'
import { getInvoiceSettings } from '@/lib/invoices'
import { getCustomers, getCustomerByEmail, addNotification } from '@/lib/storage'

function newItem(): QuotationItem {
  return { description: '', qty: 1, unit_price: 0 }
}

interface Props {
  c: any
  isDark: boolean
  existing?: Quotation
  existingId?: string
  onBack: () => void
}

export default function QuotationForm({ c, isDark, existing, existingId, onBack }: Props) {
  const { toast } = useToast()
  const [settings, setSettings] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [quotationNo, setQuotationNo] = useState('')
  const [quotationDate, setQuotationDate] = useState(todayISO())
  const [validUntil, setValidUntil] = useState(validityISO())
  const [currency, setCurrency] = useState<QuotationCurrency>('LKR')
  const [clientName, setClientName] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [projectTimeline, setProjectTimeline] = useState('14 Working Days')
  const [items, setItems] = useState<QuotationItem[]>([newItem()])
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('active')
  const [allCustomers, setAllCustomers] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const nameRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    async function init() {
      const s = await getInvoiceSettings()
      setSettings(s)
      let q = existing
      if (existingId) {
        const { getQuotation } = await import('@/lib/quotations')
        const fetched = await getQuotation(existingId)
        if (fetched) q = fetched
      }
      if (q) {
        setQuotationNo(q.quotation_no)
        setQuotationDate(q.quotation_date)
        setValidUntil(q.valid_until)
        setCurrency(q.currency ?? 'LKR')
        setClientName(q.client_name)
        setClientCompany(q.client_company ?? '')
        setClientPhone(q.client_phone ?? '')
        setClientEmail(q.client_email ?? '')
        setClientAddress(q.client_address ?? '')
        setProjectTimeline(q.project_timeline ?? '14 Working Days')
        setItems(q.items?.length ? q.items : [newItem()])
        setNotes(q.notes ?? '')
        setStatus(q.status ?? 'active')
      } else {
        const no = await generateQuotationNo()
        setQuotationNo(no)
        setNotes(s.default_notes)
      }
    }
    init()
  }, [existing, existingId])

  const total = calcTotal(items)

  const updateItem = useCallback((index: number, field: keyof QuotationItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleSave = async (silent = false) => {
    if (!clientName.trim()) { toast({ title: 'Client name is required', variant: 'destructive' }); return false }
    if (!items.some(i => i.description.trim())) { toast({ title: 'Add at least one line item', variant: 'destructive' }); return false }
    setSaving(true)
    const validItems = items.filter(i => i.description.trim())
    const quotationData: Quotation = {
      quotation_no: quotationNo, quotation_date: quotationDate, valid_until: validUntil, currency,
      client_name: clientName, client_company: clientCompany, client_phone: clientPhone,
      client_email: clientEmail, client_address: clientAddress, notes, total,
      project_timeline: projectTimeline, status
    }
    try {
      if (existing?.id) {
        await updateQuotation(existing.id, quotationData, validItems)
        if (!silent) toast({ title: `Quotation ${quotationNo} updated` })
      } else {
        await createQuotation(quotationData, validItems)
        if (!silent) toast({ title: `Quotation ${quotationNo} saved` })
        // Notify the customer
        if (clientEmail) {
          const customer = await getCustomerByEmail(clientEmail).catch(() => null)
          if (customer?.id) {
            addNotification({
              customer_id: customer.id,
              type: 'quotation',
              title: `New quotation — ${quotationNo}`,
              message: `You have received a new quotation of ${fmtCurrency(total, currency)} valid until ${validUntil}. Please contact us if you wish to proceed.`,
            }).catch(() => {})
          }
        }
      }
      if (!silent) onBack()
      return true
    } catch { 
      toast({ title: 'Failed to save quotation', variant: 'destructive' })
      return false
    } finally { 
      setSaving(false) 
    }
  }

  const handlePrint = async () => {
    if (!clientName.trim()) { toast({ title: 'Fill in client name before printing', variant: 'destructive' }); return }
    
    // Save to local storage first for printing tab
    localStorage.setItem('nxt_quotation_print', JSON.stringify({
      quotation_no: quotationNo, quotation_date: quotationDate, valid_until: validUntil, currency,
      client_name: clientName, client_company: clientCompany, client_phone: clientPhone,
      client_email: clientEmail, client_address: clientAddress, project_timeline: projectTimeline,
      items: items.filter(i => i.description.trim()), notes, total, settings,
    }))
    
    // Open print window
    window.open('/quotations/print', '_blank')
  }

  const fld: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: c.subText }
  const inp: React.CSSProperties = {
    padding: '9px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8,
    background: isDark ? '#22252C' : '#fff', color: c.text, fontSize: 13, outline: 'none',
    width: '100%', boxSizing: 'border-box', fontFamily: 'inherit'
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '10px 0 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: c.subText, fontSize: 13, fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to List
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', border: `1.5px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <Printer size={16} /> Preview / Save PDF
          </button>
          <button onClick={() => handleSave(false)} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', border: 'none', background: c.brand, color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save & Send'}
          </button>
        </div>
      </div>

      <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 20, borderBottom: `1px solid ${c.border}`, paddingBottom: 12 }}>
          {existing ? `Edit Quotation — ${quotationNo}` : 'New Quotation'}
        </h2>

        {/* 1. Header Info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20, marginBottom: 24 }}>
          <div style={fld}>
            <label style={lbl}>Quotation Number</label>
            <input type="text" value={quotationNo} onChange={e => setQuotationNo(e.target.value)} style={inp} />
          </div>
          <div style={fld}>
            <label style={lbl}>Quotation Date</label>
            <input type="date" value={quotationDate} onChange={e => setQuotationDate(e.target.value)} style={inp} />
          </div>
          <div style={fld}>
            <label style={lbl}>Valid Until</label>
            <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} style={inp} />
          </div>
          <div style={fld}>
            <label style={lbl}>Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value as QuotationCurrency)} style={inp}>
              <option value="LKR">LKR (Rs.)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          <div style={fld}>
            <label style={lbl}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
              <option value="active">Active</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* 2. Customer details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24, borderTop: `1px dashed ${c.border}`, paddingTop: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Quoted To Customer</h3>
            
            <div style={{ ...fld, position: 'relative' }} ref={nameRef}>
              <label style={lbl}>Contact Person (Search or Type)</label>
              <input
                type="text"
                placeholder="Type name or email to search..."
                value={clientName}
                onChange={e => handleNameChange(e.target.value)}
                style={inp}
              />
              {showSuggestions && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: c.card, border: `1px solid ${c.border}`, borderRadius: 8,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)', zIndex: 100, marginTop: 4, overflow: 'hidden'
                }}>
                  {suggestions.map(cu => (
                    <div
                      key={cu.id}
                      onClick={() => selectCustomer(cu)}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${c.border}`, fontSize: 13, color: c.text }}
                      onMouseEnter={e => e.currentTarget.style.background = c.hover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontWeight: 600 }}>{cu.name}</div>
                      <div style={{ fontSize: 11, color: c.subText }}>{cu.email} {cu.company ? `· ${cu.company}` : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={fld}>
              <label style={lbl}>Company Name</label>
              <input type="text" value={clientCompany} onChange={e => setClientCompany(e.target.value)} style={inp} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Contact Info</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={fld}>
                <label style={lbl}>Phone Number</label>
                <input type="text" value={clientPhone} onChange={e => setClientPhone(e.target.value)} style={inp} />
              </div>
              <div style={fld}>
                <label style={lbl}>Email Address</label>
                <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} style={inp} />
              </div>
            </div>

            <div style={fld}>
              <label style={lbl}>Billing Address</label>
              <textarea value={clientAddress} onChange={e => setClientAddress(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} />
            </div>
          </div>
        </div>

        {/* 3. Items list */}
        <div style={{ marginBottom: 24, borderTop: `1px dashed ${c.border}`, paddingTop: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 14 }}>Line Items</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((item, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 150px 120px 40px', gap: 12, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Item description..."
                  value={item.description}
                  onChange={e => updateItem(index, 'description', e.target.value)}
                  style={inp}
                />
                <input
                  type="number"
                  placeholder="Qty"
                  min="0"
                  step="any"
                  value={item.qty}
                  onChange={e => updateItem(index, 'qty', parseFloat(e.target.value) || 0)}
                  style={{ ...inp, textAlign: 'center' }}
                />
                <input
                  type="number"
                  placeholder="Unit Price"
                  min="0"
                  step="any"
                  value={item.unit_price}
                  onChange={e => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                  style={{ ...inp, textAlign: 'right' }}
                />
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: c.text, paddingRight: 8 }}>
                  {fmtCurrency(item.qty * item.unit_price, currency)}
                </div>
                <button
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                  style={{
                    background: 'none', border: 'none', cursor: items.length > 1 ? 'pointer' : 'not-allowed',
                    color: items.length > 1 ? '#ef4444' : c.border, display: 'flex', padding: 8, borderRadius: 6
                  }}
                  onMouseEnter={e => { if (items.length > 1) e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setItems(prev => [...prev, newItem()])}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              border: `1.5px dashed ${c.border}`, background: 'transparent', color: c.brand,
              borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginTop: 14
            }}
          >
            <Plus size={14} /> Add Line Item
          </button>
        </div>

        {/* 4. Timeline + Notes + Total */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40, borderTop: `1px solid ${c.border}`, paddingTop: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={fld}>
              <label style={lbl}>Project Timeline</label>
              <input
                type="text"
                placeholder="e.g. 14 Working Days"
                value={projectTimeline}
                onChange={e => setProjectTimeline(e.target.value)}
                style={inp}
              />
            </div>

            <div style={fld}>
              <label style={lbl}>Notes / Terms</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                style={{ ...inp, resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 280, fontSize: 13, color: c.subText, marginBottom: 8 }}>
              <span>Subtotal:</span>
              <span>{fmtCurrency(total, currency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 280, fontSize: 18, fontWeight: 800, color: c.brand, borderTop: `2px solid ${c.border}`, paddingTop: 12, marginTop: 4 }}>
              <span>Grand Total:</span>
              <span>{fmtCurrency(total, currency)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
