import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Printer, Save, ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  Invoice, InvoiceItem, InvoiceSettings,
  calcTotal, fmtLKR, todayISO, dueDateISO,
  generateInvoiceNo, getInvoiceSettings,
  createInvoice, updateInvoice,
} from '@/lib/invoices'
import { getCustomers, getCustomerByEmail, addNotification } from '@/lib/storage'

function newItem(): InvoiceItem {
  return { description: '', qty: 1, unit_price: 0 }
}

interface Props {
  c: any
  isDark: boolean
  existing?: Invoice
  onBack: () => void
}

export default function InvoiceForm({ c, isDark, existing, onBack }: Props) {
  const { toast } = useToast()
  const [settings, setSettings] = useState<InvoiceSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(todayISO())
  const [dueDate, setDueDate] = useState(dueDateISO())
  const [status, setStatus] = useState<Invoice['status']>('unpaid')
  const [clientName, setClientName] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([newItem()])
  const [notes, setNotes] = useState('')
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
      if (existing) {
        setInvoiceNo(existing.invoice_no)
        setInvoiceDate(existing.invoice_date)
        setDueDate(existing.due_date)
        setStatus(existing.status)
        setClientName(existing.client_name)
        setClientCompany(existing.client_company ?? '')
        setClientPhone(existing.client_phone ?? '')
        setClientEmail(existing.client_email ?? '')
        setClientAddress(existing.client_address ?? '')
        setItems(existing.items?.length ? existing.items : [newItem()])
        setNotes(existing.notes ?? '')
      } else {
        const no = await generateInvoiceNo()
        setInvoiceNo(no)
        setNotes(s.default_notes)
      }
    }
    init()
  }, [existing])

  const total = calcTotal(items)

  const updateItem = useCallback((index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleSave = async () => {
    if (!clientName.trim()) { toast({ title: 'Client name is required', variant: 'destructive' }); return }
    if (!items.some(i => i.description.trim())) { toast({ title: 'Add at least one line item', variant: 'destructive' }); return }
    setSaving(true)
    const validItems = items.filter(i => i.description.trim())
    const invoiceData: Invoice = {
      invoice_no: invoiceNo, invoice_date: invoiceDate, due_date: dueDate, status,
      client_name: clientName, client_company: clientCompany, client_phone: clientPhone,
      client_email: clientEmail, client_address: clientAddress, notes, total,
    }
    try {
      if (existing?.id) {
        await updateInvoice(existing.id, invoiceData, validItems)
        toast({ title: `Invoice ${invoiceNo} updated` })
      } else {
        await createInvoice(invoiceData, validItems)
        toast({ title: `Invoice ${invoiceNo} saved` })
        // Notify the customer
        if (clientEmail) {
          const customer = await getCustomerByEmail(clientEmail).catch(() => null)
          if (customer?.id) {
            addNotification({
              customer_id: customer.id,
              type: 'invoice',
              title: `New invoice — ${invoiceNo}`,
              message: `You have a new invoice of ${fmtLKR(total)} due by ${dueDate}. Please check your Invoices section.`,
            }).catch(() => {})
          }
        }
      }
      onBack()
    } catch { toast({ title: 'Failed to save invoice', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  const handlePrint = () => {
    if (!clientName.trim()) { toast({ title: 'Fill in client name before printing', variant: 'destructive' }); return }
    localStorage.setItem('nxt_invoice_print', JSON.stringify({
      invoice_no: invoiceNo, invoice_date: invoiceDate, due_date: dueDate, status,
      client_name: clientName, client_company: clientCompany, client_phone: clientPhone,
      client_email: clientEmail, client_address: clientAddress,
      items: items.filter(i => i.description.trim()), notes, total, settings,
    }))
    window.open('/invoices/print', '_blank')
  }

  const card: React.CSSProperties = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: c.subText, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }
  const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: `1px solid ${c.borderStrong}`, borderRadius: 8, color: c.text, fontSize: 13, background: isDark ? '#22252C' : '#fff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
  const secTitle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: `1px solid ${c.border}`, background: c.card, color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
            <Printer size={15} /> Print / PDF
          </button>
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: c.brand, color: '#fff', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
            <Save size={15} /> {saving ? 'Saving…' : existing ? 'Update invoice' : 'Save invoice'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* Left column */}
        <div>
          {/* Invoice details */}
          <div style={card}>
            <p style={secTitle}>Invoice details</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={lbl}>Invoice no.</label>
                <input style={{ ...inp, background: isDark ? '#1C1E24' : '#f0f0f0', color: c.subText }} value={invoiceNo} readOnly />
              </div>
              <div>
                <label style={lbl}>Invoice date</label>
                <input type="date" style={inp} value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Due date</label>
                <input type="date" style={inp} value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
            <div style={{ width: 160 }}>
              <label style={lbl}>Status</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={status} onChange={e => setStatus(e.target.value as Invoice['status'])}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Client info */}
          <div style={card}>
            <p style={secTitle}>Bill to</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
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
          <p style={secTitle}>Line items</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 54px 100px 100px 28px', gap: 6, padding: '0 2px 6px', fontSize: 11, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <span>Description</span><span>Qty</span><span>Unit price</span>
            <span style={{ textAlign: 'right' }}>Amount</span><span></span>
          </div>

          <div style={{ marginBottom: 10 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 54px 100px 100px 28px', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <input style={inp} placeholder="Service or product" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                <input type="number" min={1} style={{ ...inp, textAlign: 'center' }} value={item.qty} onChange={e => updateItem(i, 'qty', parseFloat(e.target.value) || 1)} />
                <input type="number" min={0} placeholder="0.00" style={inp} value={item.unit_price || ''} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', paddingRight: 4, whiteSpace: 'nowrap', color: c.text }}>{fmtLKR(item.qty * item.unit_price)}</div>
                <button onClick={() => removeItem(i)} disabled={items.length === 1} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: items.length === 1 ? 'not-allowed' : 'pointer', padding: 2, borderRadius: 4, opacity: items.length === 1 ? 0.3 : 1, display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <button onClick={() => setItems(p => [...p, newItem()])} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
            <Plus size={13} /> Add item
          </button>

          {/* Totals */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${c.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: c.subText, marginBottom: 4 }}>
              <span>Subtotal</span><span style={{ fontFamily: 'monospace' }}>{fmtLKR(total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, borderTop: `1px solid ${c.border}`, paddingTop: 8, color: c.brand }}>
              <span>Grand total</span><span style={{ fontFamily: 'monospace' }}>{fmtLKR(total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500, marginTop: 4, color: c.text }}>
              <span>Due total</span><span style={{ fontFamily: 'monospace' }}>{fmtLKR(total)}</span>
            </div>
          </div>

          {/* Payment preview */}
          {settings?.bank_name && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${c.border}` }}>
              <p style={{ ...secTitle, marginBottom: 6 }}>Payment method</p>
              <div style={{ fontSize: 12, color: c.subText, lineHeight: 1.9 }}>
                <div>Bank Transfer (LKR)</div>
                <div>Name: {settings.account_name}</div>
                <div>Account: {settings.account_no}</div>
                <div>Bank: {settings.bank_name} · {settings.bank_branch}</div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
