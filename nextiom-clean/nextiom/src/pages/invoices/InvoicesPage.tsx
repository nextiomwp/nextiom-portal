import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Search, FileText, TrendingUp, CheckCircle, AlertCircle, Edit3, Trash2, Settings, ChevronLeft, ChevronRight, ArrowUpDown, CreditCard, X, ExternalLink } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Invoice, InvoiceCurrency, InvoicePayment, getInvoices, deleteInvoice, fmtCurrency, getLatestPaymentByInvoice, approveInvoicePayment, rejectInvoicePayment, requestPaymentInfo, getPaymentSlipSignedUrl } from '@/lib/invoices'

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  paid:    { label: 'Paid',    color: '#22c55e', bg: 'rgba(34,197,94,0.13)' },
  unpaid:  { label: 'Unpaid',  color: '#f59e0b', bg: 'rgba(245,158,11,0.13)' },
  overdue: { label: 'Overdue', color: '#ef4444', bg: 'rgba(239,68,68,0.13)' },
  payment_submitted: { label: 'Pending Review', color: '#3b82f6', bg: 'rgba(59,130,246,0.13)' },
  partially_paid: { label: 'Partially Paid', color: '#a855f7', bg: 'rgba(168,85,247,0.13)' },
}

function getLocalDateString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatCollectedCurrencyBreakdown(invoices: Invoice[]) {
  const totals = invoices.reduce<Record<InvoiceCurrency, number>>((acc, inv) => {
    acc[invoiceCurrency(inv)] += inv.paid_amount || 0
    return acc
  }, { LKR: 0, USD: 0 })
  return (['LKR', 'USD'] as InvoiceCurrency[])
    .filter(cur => totals[cur] > 0)
    .map(cur => fmtCurrency(totals[cur], cur))
    .join(' / ') || fmtCurrency(0, 'LKR')
}

function invoiceCurrency(invoice: Invoice): InvoiceCurrency {
  return invoice.currency === 'USD' ? 'USD' : 'LKR'
}

function formatCurrencyBreakdown(invoices: Invoice[]) {
  const totals = invoices.reduce<Record<InvoiceCurrency, number>>((acc, inv) => {
    acc[invoiceCurrency(inv)] += inv.total || 0
    return acc
  }, { LKR: 0, USD: 0 })
  return (['LKR', 'USD'] as InvoiceCurrency[])
    .filter(cur => totals[cur] > 0)
    .map(cur => fmtCurrency(totals[cur], cur))
    .join(' / ') || fmtCurrency(0, 'LKR')
}

function PaymentReviewDialog({ invoice, c, isDark, onClose, onChanged }: {
  invoice: Invoice; c: any; isDark: boolean; onClose: () => void; onChanged: () => void
}) {
  const { toast } = useToast()
  const [payment, setPayment] = useState<InvoicePayment | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'view' | 'reject' | 'info'>('view')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [slipLoading, setSlipLoading] = useState(false)

  useEffect(() => {
    getLatestPaymentByInvoice(invoice.id!).then(p => { setPayment(p); setLoading(false) }).catch(() => setLoading(false))
  }, [invoice.id])

  async function doApprove() {
    if (!payment) return
    setBusy(true)
    try {
      await approveInvoicePayment(payment, invoice)
      toast({ title: 'Payment approved' })
      onChanged(); onClose()
    } catch { toast({ title: 'Failed to approve', variant: 'destructive' }) }
    finally { setBusy(false) }
  }

  async function doReject() {
    if (!payment || !reason.trim()) return
    setBusy(true)
    try {
      await rejectInvoicePayment(payment, invoice, reason.trim())
      toast({ title: 'Payment rejected' })
      onChanged(); onClose()
    } catch { toast({ title: 'Failed to reject', variant: 'destructive' }) }
    finally { setBusy(false) }
  }

  async function doRequestInfo() {
    if (!payment || !reason.trim()) return
    setBusy(true)
    try {
      await requestPaymentInfo(payment, invoice, reason.trim())
      toast({ title: 'Info request sent' })
      onChanged(); onClose()
    } catch { toast({ title: 'Failed', variant: 'destructive' }) }
    finally { setBusy(false) }
  }

  function downloadSlip() {
    if (!payment || !payment.slip_url) return
    window.open(payment.slip_url, '_blank', 'noopener,noreferrer')
  }

  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }
  const val: React.CSSProperties = { fontSize: 13, color: c.text, marginBottom: 10 }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', zIndex: 300 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 720, maxWidth: '95vw', maxHeight: '92vh', background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, zIndex: 301, display: 'flex', flexDirection: 'column', boxShadow: '0 12px 48px rgba(0,0,0,0.4)' }}>
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CreditCard size={18} style={{ color: c.brand }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Review Payment — {invoice.invoice_no}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ padding: 22, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ color: c.subText, fontSize: 13 }}>Loading payment…</div>
          ) : !payment ? (
            <div style={{ color: c.subText, fontSize: 13 }}>No payment submission found.</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  <div style={lbl}>Customer</div>
                  <div style={val}>{invoice.client_name} ({invoice.client_email})</div>
                  <div style={lbl}>Transaction ID / Reference</div>
                  <div style={{ ...val, fontFamily: 'JetBrains Mono, monospace' as const }}>{payment.transaction_id}</div>
                  <div style={lbl}>Paid Amount (This Txn)</div>
                  <div style={{ ...val, fontFamily: 'JetBrains Mono, monospace' as const, fontWeight: 700, color: c.brand }}>{fmtCurrency(payment.paid_amount, invoiceCurrency(invoice))}</div>
                  <div style={lbl}>Payment Date</div>
                  <div style={val}>{payment.payment_date}</div>
                  <div style={lbl}>Invoice Total</div>
                  <div style={val}>{fmtCurrency(invoice.total, invoiceCurrency(invoice))}</div>
                  <div style={lbl}>Total Approved Paid</div>
                  <div style={val}>{fmtCurrency(invoice.paid_amount || 0, invoiceCurrency(invoice))}</div>
                  <div style={lbl}>Remaining Balance</div>
                  <div style={{ ...val, color: '#ef4444', fontWeight: 600 }}>{fmtCurrency(Math.max(0, (invoice.total || 0) - (invoice.paid_amount || 0)), invoiceCurrency(invoice))}</div>
                  {payment.notes && (<><div style={lbl}>Customer Notes</div><div style={val}>{payment.notes}</div></>)}
                  <div style={lbl}>Submitted</div>
                  <div style={val}>{payment.created_at ? new Date(payment.created_at).toLocaleString() : '—'}</div>
                </div>
                <div>
                  <div style={lbl}>Payment Slip</div>
                  {(payment.slip_path || payment.slip_url) ? (
                    <div style={{ border: `1px solid ${c.border}`, borderRadius: 8, overflow: 'hidden', background: isDark ? '#22252C' : '#fafafa' }}>
                      {/* Detect image type from the raw path (slip_url after signing has a long token URL that breaks extension matching) */}
                      {/\.(png|jpe?g|gif|webp)$/i.test(payment.slip_path || payment.slip_url || '') ? (
                        payment.slip_url && /^https?:\/\//i.test(payment.slip_url)
                          ? <img src={payment.slip_url} alt="slip" style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'contain' }} />
                          : <div style={{ padding: '14px 16px', fontSize: 13, color: c.subText }}>Image slip — click Download to view.</div>
                      ) : (
                        <div style={{ padding: '14px 16px', fontSize: 13, color: c.text }}>
                          📄 Payment slip uploaded ({(payment.slip_path || '').split('.').pop()?.toUpperCase() || 'FILE'})
                        </div>
                      )}
                      <button
                        onClick={downloadSlip}
                        disabled={slipLoading}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderTop: `1px solid ${c.border}`, borderLeft: 'none', borderRight: 'none', borderBottom: 'none', background: 'none', color: slipLoading ? c.subText : c.brand, fontSize: 12, fontWeight: 600, cursor: slipLoading ? 'wait' : 'pointer', width: '100%', fontFamily: 'inherit' }}
                      >
                        <ExternalLink size={13} />
                        {slipLoading ? 'Generating link…' : 'Download / Open slip'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ ...val, fontStyle: 'italic' as const }}>No slip uploaded</div>
                  )}
                </div>
              </div>

              {mode !== 'view' && (
                <div style={{ marginTop: 16 }}>
                  <div style={lbl}>{mode === 'reject' ? 'Rejection reason' : 'Information needed from customer'}</div>
                  <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={mode === 'reject' ? 'Why is this payment being rejected?' : 'What additional information is needed?'}
                    style={{ width: '100%', minHeight: 80, padding: '9px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8, background: isDark ? '#22252C' : '#fff', color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical' as const, fontFamily: 'inherit' }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {payment && (
          <div style={{ padding: '14px 22px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' as const }}>
            {mode === 'view' && payment.status === 'submitted' && (
              <>
                <button onClick={() => { setMode('info'); setReason('') }} disabled={busy} style={{ padding: '8px 16px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Request Info</button>
                <button onClick={() => { setMode('reject'); setReason('') }} disabled={busy} style={{ padding: '8px 16px', border: 'none', background: '#ef4444', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>Reject</button>
                <button onClick={doApprove} disabled={busy} style={{ padding: '8px 20px', border: 'none', background: '#22c55e', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>Mark as Paid</button>
              </>
            )}
            {mode === 'reject' && (
              <>
                <button onClick={() => setMode('view')} disabled={busy} style={{ padding: '8px 16px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Back</button>
                <button onClick={doReject} disabled={busy || !reason.trim()} style={{ padding: '8px 20px', border: 'none', background: '#ef4444', color: '#fff', borderRadius: 8, cursor: busy ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, opacity: busy || !reason.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>Confirm Reject</button>
              </>
            )}
            {mode === 'info' && (
              <>
                <button onClick={() => setMode('view')} disabled={busy} style={{ padding: '8px 16px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Back</button>
                <button onClick={doRequestInfo} disabled={busy || !reason.trim()} style={{ padding: '8px 20px', border: 'none', background: c.brand, color: '#fff', borderRadius: 8, cursor: busy ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, opacity: busy || !reason.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>Send Request</button>
              </>
            )}
            {mode === 'view' && payment.status !== 'submitted' && (
              <span style={{ fontSize: 12, color: c.subText, padding: '6px 12px' }}>Status: <strong>{payment.status}</strong>{payment.admin_reason ? ` — ${payment.admin_reason}` : ''}</span>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function dayKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }
function monthKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()}` }

interface CalFilter { mode: 'none' | 'month' | 'day'; year?: number; month?: number; day?: number }

function CalendarWidget({ invoices, calFilter, onDayClick, onMonthClick, c, isDark }: {
  invoices: Invoice[]; calFilter: CalFilter; onDayClick: (y: number | null, m?: number, d?: number) => void;
  onMonthClick: (y: number, m: number) => void; c: any; isDark: boolean
}) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const firstDay = new Date(viewYear, viewMonth, 1)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startDow = firstDay.getDay()

  const parsedDates = useMemo(() =>
    invoices.map(inv => inv.invoice_date ? new Date(inv.invoice_date) : null).filter(Boolean) as Date[]
  , [invoices])

  const invoiceDayKeys = new Set(parsedDates.map(d => dayKey(d)))
  const thisMonthKey = `${viewYear}-${viewMonth}`
  const isMonthFiltered = calFilter.mode === 'month' && calFilter.year === viewYear && calFilter.month === viewMonth
  const todayKey = dayKey(today)

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  let footerText = 'All invoices shown'
  if (calFilter.mode === 'day') footerText = `${new Date(calFilter.year!, calFilter.month!, calFilter.day!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  else if (calFilter.mode === 'month') footerText = `${new Date(calFilter.year!, calFilter.month!, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`

  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}><ChevronLeft size={15} /></button>
        <button
          onClick={() => onMonthClick(viewYear, viewMonth)}
          style={{ background: isMonthFiltered ? 'rgba(232,123,53,0.12)' : 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: isMonthFiltered ? c.brand : c.text, padding: '2px 8px', borderRadius: 6 }}
        >{monthLabel}</button>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}><ChevronRight size={15} /></button>
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: c.subText, textTransform: 'uppercase', padding: '2px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} />
            const cellKey = dayKey(new Date(viewYear, viewMonth, day))
            const isToday = cellKey === todayKey
            const hasInvoice = invoiceDayKeys.has(cellKey)
            const isSelected = calFilter.mode === 'day' && calFilter.year === viewYear && calFilter.month === viewMonth && calFilter.day === day
            const isMonthTinted = calFilter.mode === 'month' && calFilter.year === viewYear && calFilter.month === viewMonth
            return (
              <div key={idx}
                onClick={() => onDayClick(viewYear, viewMonth, day)}
                style={{
                  textAlign: 'center', borderRadius: 6, padding: '4px 0', cursor: 'pointer', position: 'relative',
                  background: isSelected ? c.brand : isMonthTinted ? 'rgba(232,123,53,0.10)' : 'transparent',
                  color: isSelected ? '#fff' : hasInvoice ? c.text : c.subText,
                  fontWeight: hasInvoice || isToday ? 700 : 400,
                  fontSize: 11,
                  border: isToday && !isSelected ? `1.5px dashed ${c.brand}` : '1.5px solid transparent',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? c.brand : isMonthTinted ? 'rgba(232,123,53,0.10)' : 'transparent' }}
              >
                {day}
                {hasInvoice && !isSelected && (
                  <span style={{ position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)', width: 3, height: 3, borderRadius: '50%', background: c.brand }} />
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
        <div style={{ fontSize: 10, color: c.subText }}>{calFilter.mode !== 'none' ? `Filtered: ${footerText}` : 'Click date or month to filter'}</div>
        {calFilter.mode !== 'none' && (
          <button onClick={() => onDayClick(null)} style={{ fontSize: 10, color: c.brand, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '2px 0', marginTop: 3 }}>Clear filter</button>
        )}
      </div>
    </div>
  )
}

interface Props {
  c: any
  isDark: boolean
  onNew: () => void
  onEdit: (id: string) => void
  onSettings: () => void
}

export default function InvoicesPage({ c, isDark, onNew, onEdit, onSettings }: Props) {
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [calFilter, setCalFilter] = useState<CalFilter>({ mode: 'none' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [reviewInvoice, setReviewInvoice] = useState<Invoice | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await getInvoices()
      const todayStr = getLocalDateString()
      const mapped = data.map(inv => {
        const cleanDueDate = inv.due_date ? inv.due_date.substring(0, 10) : ''
        if (inv.status !== 'paid' && inv.status !== 'payment_submitted' && cleanDueDate && cleanDueDate < todayStr) {
          return { ...inv, status: 'overdue' as const }
        }
        return inv
      })
      setInvoices(mapped)
    }
    catch { toast({ title: 'Failed to load invoices', variant: 'destructive' }) }
    finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    let arr = invoices.filter(inv => {
      const q = search.toLowerCase()
      const matchQ = !q || inv.invoice_no.toLowerCase().includes(q)
        || inv.client_name.toLowerCase().includes(q)
        || (inv.client_company ?? '').toLowerCase().includes(q)
      const matchS = statusFilter === 'all' || inv.status === statusFilter
      if (!matchQ || !matchS) return false
      if (calFilter.mode === 'day') {
        const d = inv.invoice_date ? new Date(inv.invoice_date) : null
        if (!d) return false
        if (d.getFullYear() !== calFilter.year || d.getMonth() !== calFilter.month || d.getDate() !== calFilter.day) return false
      } else if (calFilter.mode === 'month') {
        const d = inv.invoice_date ? new Date(inv.invoice_date) : null
        if (!d) return false
        if (d.getFullYear() !== calFilter.year || d.getMonth() !== calFilter.month) return false
      }
      return true
    })
    arr.sort((a, b) => {
      const da = a.invoice_date ? new Date(a.invoice_date).getTime() : 0
      const db = b.invoice_date ? new Date(b.invoice_date).getTime() : 0
      return sortDir === 'asc' ? da - db : db - da
    })
    return arr
  }, [invoices, search, statusFilter, calFilter, sortDir])

  const totalBilled = formatCurrencyBreakdown(invoices)
  const totalPaid = formatCollectedCurrencyBreakdown(invoices)
  const totalOverdue = formatCurrencyBreakdown(invoices.filter(i => i.status === 'overdue'))

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteInvoice(deleteId)
      setInvoices(p => p.filter(i => i.id !== deleteId))
      toast({ title: 'Invoice deleted' })
    } catch { toast({ title: 'Failed to delete', variant: 'destructive' }) }
    finally { setDeleteId(null) }
  }

  const card = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }
  const inp: React.CSSProperties = {
    padding: '8px 12px', border: `1px solid ${c.borderStrong}`, borderRadius: 8,
    color: c.text, fontSize: 13, background: isDark ? '#22252C' : '#fff',
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const,
  }
  const metrics = [
    { label: 'Total Invoices', value: String(invoices.length), Icon: FileText,   color: c.text },
    { label: 'Total Billed',   value: totalBilled,    Icon: TrendingUp,  color: '#378ADD' },
    { label: 'Collected',      value: totalPaid,       Icon: CheckCircle, color: '#639922' },
    { label: 'Overdue',        value: totalOverdue,    Icon: AlertCircle, color: '#ef4444' },
  ]

  const handleDayClick = (year: number | null, month?: number, day?: number) => {
    if (year === null) { setCalFilter({ mode: 'none' }); return }
    if (calFilter.mode === 'day' && calFilter.year === year && calFilter.month === month && calFilter.day === day) {
      setCalFilter({ mode: 'none' })
    } else {
      setCalFilter({ mode: 'day', year, month, day })
    }
  }
  const handleMonthClick = (year: number, month: number) => {
    if (calFilter.mode === 'month' && calFilter.year === year && calFilter.month === month) {
      setCalFilter({ mode: 'none' })
    } else {
      setCalFilter({ mode: 'month', year, month })
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: c.text }}>Invoices</h2>
          <p style={{ fontSize: 13, color: c.subText, marginTop: 2 }}>Manage and track all client invoices</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onSettings} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: `1px solid ${c.border}`, background: c.card, color: c.subText, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
            <Settings size={15} /> Settings
          </button>
          <button onClick={onNew} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: c.brand, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
            <Plus size={15} /> New invoice
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {metrics.map(m => (
          <div key={m.label} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</span>
              <m.Icon size={16} color={m.color} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout: list + calendar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, alignItems: 'start' }}>
        {/* Left: filters + list */}
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.subText, pointerEvents: 'none' }} />
              <input style={{ ...inp, paddingLeft: 30, width: '100%' }} placeholder="Search by client, company, or invoice no…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inp, width: 160, cursor: 'pointer' }}>
              <option value="all">All status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="overdue">Overdue</option>
              <option value="payment_submitted">Pending Review</option>
              <option value="partially_paid">Partially Paid</option>
            </select>
            <button
              onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
              title={sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', border: `1px solid ${c.borderStrong}`, background: isDark ? '#22252C' : '#fff', color: c.subText, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}
            >
              <ArrowUpDown size={13} /> {sortDir === 'desc' ? 'Newest' : 'Oldest'}
            </button>
          </div>

          {/* List */}
          {loading ? (
            <div>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: 52, borderRadius: 10, background: c.hover, marginBottom: 8 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: c.subText }}>
              <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
              <p style={{ fontWeight: 500 }}>{invoices.length === 0 ? 'No invoices yet' : 'No invoices match your search'}</p>
              {invoices.length === 0 && (
                <button onClick={onNew} style={{ marginTop: 16, padding: '8px 16px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
                  <Plus size={14} /> Create first invoice
                </button>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '85px 1.2fr 1.5fr 100px 100px 85px 85px 115px 75px', gap: 12, padding: '0 14px 8px', fontSize: 11, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <span>Invoice</span><span>Service</span><span>Client</span><span>Total</span><span>Paid</span>
                <span style={{ textAlign: 'right' }}>Date</span><span style={{ textAlign: 'right' }}>Due Date</span><span>Status</span><span></span>
              </div>
              {filtered.map(inv => {
                const st = STATUS[inv.status] ?? STATUS.unpaid
                return (
                  <div
                    key={inv.id}
                    style={{ display: 'grid', gridTemplateColumns: '85px 1.2fr 1.5fr 100px 100px 85px 85px 115px 75px', gap: 12, alignItems: 'center', padding: '12px 14px', background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, marginBottom: 6, transition: 'border-color 0.15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = c.brand)}
                    onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = c.border)}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: c.subText }}>{inv.invoice_no}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inv.service_name || ''}>
                        {inv.service_name || '—'}
                      </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.client_name}</div>
                      {inv.client_company && <div style={{ fontSize: 11, color: c.subText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.client_company}</div>}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{fmtCurrency(inv.total, invoiceCurrency(inv))}</span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: inv.paid_amount && inv.paid_amount > 0 ? '#22c55e' : c.subText }}>
                      {fmtCurrency(inv.paid_amount || 0, invoiceCurrency(inv))}
                    </span>
                    <span style={{ fontSize: 12, color: c.subText, textAlign: 'right' }}>{inv.invoice_date}</span>
                    <span style={{ fontSize: 12, color: c.subText, textAlign: 'right' }}>{inv.due_date ? inv.due_date.substring(0, 10) : '—'}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' as const }}>{st.label}</span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {inv.status === 'payment_submitted' && (
                        <button onClick={() => setReviewInvoice(inv)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px 5px', borderRadius: 6, display: 'flex' }} title="Review payment">
                          <CreditCard size={14} />
                        </button>
                      )}
                      <button onClick={() => onEdit(inv.id!)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: '4px 5px', borderRadius: 6, display: 'flex' }} title="Edit">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => setDeleteId(inv.id!)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px 5px', borderRadius: 6, display: 'flex' }} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Right: calendar */}
        <CalendarWidget
          invoices={invoices}
          calFilter={calFilter}
          onDayClick={handleDayClick}
          onMonthClick={handleMonthClick}
          c={c}
          isDark={isDark}
        />
      </div>

      {reviewInvoice && (
        <PaymentReviewDialog
          invoice={reviewInvoice}
          c={c}
          isDark={isDark}
          onClose={() => setReviewInvoice(null)}
          onChanged={load}
        />
      )}

      {/* Delete confirm dialog */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: 28, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: c.text }}>Delete this invoice?</h3>
            <p style={{ fontSize: 13, color: c.subText, marginBottom: 22 }}>This action cannot be undone. The invoice and all its line items will be permanently deleted.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: '8px 18px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleDelete} style={{ padding: '8px 18px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
