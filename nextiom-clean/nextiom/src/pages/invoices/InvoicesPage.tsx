import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Search, FileText, TrendingUp, CheckCircle, AlertCircle, Edit3, Trash2, Settings, ChevronLeft, ChevronRight, ArrowUpDown, CreditCard, X, ExternalLink, Clock, RotateCcw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/customSupabaseClient'
import { Invoice, InvoiceCurrency, InvoicePayment, getInvoices, getInvoice, deleteInvoice, restoreInvoice, permanentlyDeleteInvoice, getInvoiceSettings, fmtCurrency, getLatestPaymentByInvoice, approveInvoicePayment, rejectInvoicePayment, requestPaymentInfo, getPaymentSlipSignedUrl, getInvoicePayments, refundInvoice, resolvePaymentMethod } from '@/lib/invoices'

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  paid:    { label: 'Paid',    color: '#22c55e', bg: 'rgba(34,197,94,0.13)' },
  unpaid:  { label: 'Unpaid',  color: '#f59e0b', bg: 'rgba(245,158,11,0.13)' },
  overdue: { label: 'Overdue', color: '#ef4444', bg: 'rgba(239,68,68,0.13)' },
  payment_submitted: { label: 'Pending Review', color: '#3b82f6', bg: 'rgba(59,130,246,0.13)' },
  partially_paid: { label: 'Partially Paid', color: '#a855f7', bg: 'rgba(168,85,247,0.13)' },
  refunded: { label: 'Refunded', color: '#64748b', bg: 'rgba(100,116,139,0.13)' },
  partially_refunded: { label: 'Partially Refunded', color: 'var(--brand-color)', bg: 'var(--brand-color-light)' },
  ongoing: { label: 'On Going', color: '#06b6d4', bg: 'rgba(6,182,212,0.13)' },
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
    const paid = inv.paid_amount || (inv.status === 'paid' ? inv.total : 0)
    const refunded = inv.refunded_amount || 0
    acc[invoiceCurrency(inv)] += Math.max(0, paid - refunded)
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
  const [payments, setPayments] = useState<InvoicePayment[]>([])
  const [selectedPaymentIndex, setSelectedPaymentIndex] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'view' | 'reject' | 'info'>('view')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [slipLoading, setSlipLoading] = useState(false)

  useEffect(() => {
    getInvoicePayments(invoice.id!)
      .then(list => {
        setPayments(list)
        setSelectedPaymentIndex(0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [invoice.id])

  const payment = payments[selectedPaymentIndex] || null

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
            <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>
              {invoice.status === 'payment_submitted' ? 'Review Payment' : 'Payment Details'} — {invoice.invoice_no}
            </span>
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
              <div style={{ display: 'grid', gridTemplateColumns: (typeof window !== 'undefined' && window.innerWidth < 640) ? '1fr' : '1fr 1fr', gap: 18 }}>
                <div>
                  <div style={lbl}>Customer</div>
                  <div style={val}>{invoice.client_name} ({invoice.client_email})</div>
                  <div style={lbl}>Bank Name / Payment Method</div>
                  <div style={val}>{payment.bank_account_name || '—'}</div>
                  {payment.bank_account_name === 'Cheque' ? (
                    <>
                      <div style={lbl}>Cheque Number</div>
                      <div style={{ ...val, fontFamily: 'JetBrains Mono, monospace' as const }}>{payment.transaction_id}</div>
                    </>
                  ) : payment.bank_account_name === 'Cash' ? null : (
                    <>
                      <div style={lbl}>Transaction ID / Reference</div>
                      <div style={{ ...val, fontFamily: 'JetBrains Mono, monospace' as const }}>{payment.transaction_id}</div>
                    </>
                  )}
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

function RefundDialog({ invoice, c, isDark, onClose, onChanged }: {
  invoice: Invoice; c: any; isDark: boolean; onClose: () => void; onChanged: () => void
}) {
  const { toast } = useToast()
  const [fullInvoice, setFullInvoice] = useState<Invoice | null>(null)
  const [loadingInvoice, setLoadingInvoice] = useState(true)
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [serviceCharge, setServiceCharge] = useState('')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const total = Number(invoice.total || 0)
  const paidAmt = Number(invoice.paid_amount || total)
  const currentRefunded = Number(invoice.refunded_amount || 0)
  const maxRefundable = Math.max(0, paidAmt - currentRefunded)

  useEffect(() => {
    setLoadingInvoice(true)
    getInvoice(invoice.id!)
      .then(res => {
        setFullInvoice(res)
        setLoadingInvoice(false)
      })
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load invoice items', variant: 'destructive' })
        setLoadingInvoice(false)
      })
  }, [invoice.id])

  const allItemIds = useMemo(() => {
    if (!fullInvoice || !fullInvoice.items) return []
    return fullInvoice.items.map(item => item.id!)
  }, [fullInvoice])

  const selectedItemsTotal = useMemo(() => {
    if (!fullInvoice || !fullInvoice.items) return 0
    return fullInvoice.items
      .filter(item => selectedItems.includes(item.id!))
      .reduce((sum, item) => sum + (item.qty * item.unit_price - (item.discount || 0)), 0)
  }, [fullInvoice, selectedItems])

  const calculatedPartialAmount = useMemo(() => {
    const charge = Number(serviceCharge) || 0
    return Math.max(0, selectedItemsTotal - charge)
  }, [selectedItemsTotal, serviceCharge])

  useEffect(() => {
    if (refundType === 'full') {
      setAmount(String(maxRefundable))
      setServiceCharge('0')
    } else {
      setAmount(String(calculatedPartialAmount))
    }
  }, [refundType, maxRefundable, calculatedPartialAmount])

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(x => x !== itemId)
      } else {
        return [...prev, itemId]
      }
    })
  }

  async function handleRefund() {
    const refundAmt = Number(amount)
    const chargeAmt = Number(serviceCharge) || 0

    if (isNaN(refundAmt) || refundAmt < 0) {
      toast({ title: 'Invalid amount', description: 'Please enter a valid refund amount.', variant: 'destructive' })
      return
    }

    if (refundType === 'partial' && selectedItems.length === 0) {
      toast({ title: 'No items selected', description: 'Please select at least one item to refund.', variant: 'destructive' })
      return
    }

    if (refundAmt > maxRefundable) {
      toast({ title: 'Amount exceeds limit', description: `Maximum refundable amount is ${fmtCurrency(maxRefundable, invoiceCurrency(invoice))}`, variant: 'destructive' })
      return
    }

    setBusy(true)
    try {
      const itemsToRefund = refundType === 'full' ? allItemIds : selectedItems
      await refundInvoice(invoice.id!, refundAmt, reason.trim(), chargeAmt, itemsToRefund)
      toast({ title: 'Refund processed successfully' })
      onChanged()
      onClose()
    } catch (e: any) {
      toast({ title: 'Failed to process refund', description: e.message || 'Something went wrong', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: c.subText, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 4 }
  const val: React.CSSProperties = { fontSize: 13, color: c.text, marginBottom: 10 }
  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: `1.5px solid ${c.border}`, borderRadius: 8,
    background: isDark ? '#22252C' : '#fff', color: c.text, fontSize: 13,
    outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit'
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', zIndex: 300 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 560, maxWidth: '95vw', maxHeight: '92vh', background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, zIndex: 301, display: 'flex', flexDirection: 'column', boxShadow: '0 12px 48px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RotateCcw size={18} style={{ color: 'var(--brand-color)' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Process Refund — {invoice.invoice_no}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          {loadingInvoice ? (
            <div style={{ color: c.subText, fontSize: 13, textAlign: 'center', padding: 20 }}>Loading invoice details…</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: (typeof window !== 'undefined' && window.innerWidth < 640) ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={lbl}>Client</div>
                  <div style={val}>{invoice.client_name}</div>
                </div>
                <div>
                  <div style={lbl}>Invoice Total</div>
                  <div style={val}>{fmtCurrency(total, invoiceCurrency(invoice))}</div>
                </div>
                <div>
                  <div style={lbl}>Paid Amount</div>
                  <div style={val}>{fmtCurrency(paidAmt, invoiceCurrency(invoice))}</div>
                </div>
                <div>
                  <div style={lbl}>Already Refunded</div>
                  <div style={val}>{fmtCurrency(currentRefunded, invoiceCurrency(invoice))}</div>
                </div>
              </div>

              <div style={{ height: '1px', background: c.border, margin: '6px 0' }} />

              <div>
                <div style={lbl}>Refund Type</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4, marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: c.text, cursor: 'pointer' }}>
                    <input type="radio" checked={refundType === 'full'} onChange={() => setRefundType('full')} style={{ accentColor: c.brand }} disabled={maxRefundable <= 0} />
                    Full Refund ({fmtCurrency(maxRefundable, invoiceCurrency(invoice))})
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: c.text, cursor: 'pointer' }}>
                    <input type="radio" checked={refundType === 'partial'} onChange={() => setRefundType('partial')} style={{ accentColor: c.brand }} disabled={maxRefundable <= 0} />
                    Partial Refund
                  </label>
                </div>
              </div>

              {refundType === 'partial' && (
                <div>
                  <div style={{ ...lbl, marginBottom: 8 }}>Select Items & Packages to Refund</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWait: '180px', overflowY: 'auto', border: `1px solid ${c.border}`, borderRadius: 8, padding: 12, background: isDark ? 'rgba(0,0,0,0.15)' : '#fafafa' }}>
                    {(fullInvoice?.items || []).map(item => {
                      const itemAmt = item.qty * item.unit_price - (item.discount || 0)
                      return (
                        <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: c.text, cursor: 'pointer', padding: '6px 4px', borderBottom: `1px solid ${c.border}`, last: { borderBottom: 'none' } }}>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id!)}
                            onChange={() => handleToggleItem(item.id!)}
                            style={{ accentColor: c.brand, marginTop: 3 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{item.description}</div>
                            <div style={{ fontSize: 11, color: c.subText }}>Qty: {item.qty} × {fmtCurrency(item.unit_price, invoiceCurrency(invoice))} {item.discount ? `(Disc: ${fmtCurrency(item.discount, invoiceCurrency(invoice))})` : ''}</div>
                          </div>
                          <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                            {fmtCurrency(itemAmt, invoiceCurrency(invoice))}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: (typeof window !== 'undefined' && window.innerWidth < 640) ? '1fr' : '1fr 1fr', gap: 14 }}>
                {refundType === 'partial' && (
                  <div>
                    <div style={lbl}>Service Charge ({invoiceCurrency(invoice)})</div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={serviceCharge}
                      onChange={e => setServiceCharge(e.target.value)}
                      placeholder="e.g. 500"
                      style={inp}
                      disabled={busy}
                    />
                  </div>
                )}
                <div>
                  <div style={lbl}>Net Refund Amount ({invoiceCurrency(invoice)})</div>
                  <input
                    type="text"
                    value={fmtCurrency(Number(amount) || 0, invoiceCurrency(invoice))}
                    style={{ ...inp, background: isDark ? '#1C1E24' : '#eee', fontWeight: 700, cursor: 'not-allowed' }}
                    disabled={true}
                  />
                </div>
              </div>

              <div>
                <div style={lbl}>Refund Reason / Notes (Viewable in PDF)</div>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Reason for refund and service charge details..."
                  style={{ ...inp, minHeight: 70, resize: 'vertical' }}
                  disabled={busy}
                />
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10, background: isDark ? 'rgba(0,0,0,0.1)' : '#fafafa', flexShrink: 0 }}>
          <button onClick={onClose} disabled={busy} style={{ padding: '8px 16px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button
            onClick={handleRefund}
            disabled={busy || maxRefundable <= 0 || loadingInvoice}
            style={{
              padding: '8px 20px', border: 'none', background: 'var(--brand-color)', color: '#fff',
              borderRadius: 8, cursor: busy || maxRefundable <= 0 || loadingInvoice ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit', opacity: busy || maxRefundable <= 0 || loadingInvoice ? 0.6 : 1
            }}
          >
            {busy ? 'Processing...' : 'Process Refund'}
          </button>
        </div>
      </div>
    </>
  )
}

function dayKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }

function TimelineDrawer({ invoice, c, isDark, onClose }: {
  invoice: Invoice; c: any; isDark: boolean; onClose: () => void
}) {
  const [payments, setPayments] = useState<InvoicePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setActive(true), 10)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!invoice.id) return
    setLoading(true)
    getInvoicePayments(invoice.id)
      .then(p => { setPayments(p); setLoading(false) })
      .catch(() => setLoading(false))
  }, [invoice.id])

  const handleClose = () => {
    setActive(false)
    setTimeout(onClose, 250)
  }

  const events = useMemo(() => {
    const list: Array<{
      time: Date
      title: string
      desc: string
      type: 'created' | 'submitted' | 'approved' | 'rejected' | 'info_requested'
    }> = []

    if (invoice.created_at) {
      list.push({
        time: new Date(invoice.created_at),
        title: 'Invoice Created',
        desc: `Invoice ${invoice.invoice_no} was created by Admin. Total: ${fmtCurrency(invoice.total, invoice.currency === 'USD' ? 'USD' : 'LKR')}`,
        type: 'created'
      })
    }

    payments.forEach(p => {
      if (p.created_at) {
        list.push({
          time: new Date(p.created_at),
          title: 'Payment Submitted',
          desc: `Customer submitted payment of ${fmtCurrency(p.paid_amount, invoice.currency === 'USD' ? 'USD' : 'LKR')}${p.bank_account_name ? ` via ${p.bank_account_name}` : ''} (Ref: ${p.transaction_id}).${p.notes ? ` Notes: "${p.notes}"` : ''}`,
          type: 'submitted'
        })
      }

      if (p.status && p.status !== 'submitted' && p.updated_at) {
        let title = ''
        let desc = ''
        if (p.status === 'approved') {
          title = 'Payment Approved'
          desc = `Admin approved the payment of ${fmtCurrency(p.paid_amount, invoice.currency === 'USD' ? 'USD' : 'LKR')}.`
        } else if (p.status === 'rejected') {
          title = 'Payment Rejected'
          desc = `Admin rejected the payment. Reason: "${p.admin_reason || 'No reason provided'}"`
        } else if (p.status === 'info_requested') {
          title = 'Info Requested'
          desc = `Admin requested additional information: "${p.admin_reason}"`
        }

        list.push({
          time: new Date(p.updated_at),
          title,
          desc,
          type: p.status
        })
      }
    })

    list.sort((a, b) => a.time.getTime() - b.time.getTime())
    return list
  }, [invoice, payments])

  return (
    <>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', zIndex: 400, opacity: active ? 1 : 0, transition: 'opacity 0.25s ease' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, maxWidth: '100vw', background: c.card, borderLeft: `1px solid ${c.border}`, zIndex: 401, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 40px rgba(0,0,0,0.25)', transform: active ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: c.text }}>Invoice Timeline</h3>
            <p style={{ fontSize: 12, color: c.subText, margin: '2px 0 0' }}>History and payment progression</p>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.subText, display: 'flex', padding: 6, borderRadius: 8, transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ padding: 16, background: isDark ? '#22252C' : '#f8fafc', border: `1px solid ${c.border}`, borderRadius: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Invoice Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: c.subText }}>Invoice No</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.text, fontFamily: 'monospace' }}>{invoice.invoice_no}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: c.subText }}>Status</div>
                <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: STATUS[invoice.status]?.color, background: STATUS[invoice.status]?.bg, padding: '2px 6px', borderRadius: 4, marginTop: 2 }}>{STATUS[invoice.status]?.label}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: c.subText }}>Client</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{invoice.client_name}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: c.subText }}>Grand Total</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.brand }}>{fmtCurrency(invoice.total, invoice.currency === 'USD' ? 'USD' : 'LKR')}</div>
              </div>
              {invoice.status === 'paid' && (
                <div>
                  <div style={{ fontSize: 11, color: c.subText }}>Payment Method</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{resolvePaymentMethod(payments) || '—'}</div>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 0' }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.border }} />
                    <div style={{ width: 2, flex: 1, background: c.border, minHeight: 40 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 14, width: '40%', background: c.hover, borderRadius: 4, marginBottom: 6 }} />
                    <div style={{ height: 12, width: '90%', background: c.hover, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: c.subText, fontSize: 13, fontStyle: 'italic' }}>
              No history records found for this invoice.
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: 8 }}>
              {events.map((ev, idx) => {
                const isLast = idx === events.length - 1
                let dotColor = '#94a3b8'
                let dotBg = isDark ? '#1C1E24' : '#fff'
                if (ev.type === 'created') {
                  dotColor = '#6366f1'
                } else if (ev.type === 'submitted') {
                  dotColor = '#f59e0b'
                } else if (ev.type === 'approved') {
                  dotColor = '#22c55e'
                } else if (ev.type === 'rejected') {
                  dotColor = '#ef4444'
                } else if (ev.type === 'info_requested') {
                  dotColor = '#a855f7'
                }

                return (
                  <div key={idx} style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: `3px solid ${dotColor}`, background: dotBg, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                      {!isLast && (
                        <div style={{ width: 2, position: 'absolute', top: 14, bottom: -20, background: c.borderStrong, zIndex: 1 }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: c.text }}>{ev.title}</h4>
                        <span style={{ fontSize: 10, color: c.subText, whiteSpace: 'nowrap' }}>
                          {ev.time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {ev.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: c.subText, margin: '6px 0 0', lineHeight: 1.5 }}>{ev.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
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
                  background: isSelected ? c.brand : isMonthTinted ? 'var(--brand-color-light)' : 'transparent',
                  color: isSelected ? '#fff' : hasInvoice ? c.text : c.subText,
                  fontWeight: hasInvoice || isToday ? 700 : 400,
                  fontSize: 11,
                  border: isToday && !isSelected ? `1.5px dashed ${c.brand}` : '1.5px solid transparent',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? c.brand : isMonthTinted ? 'var(--brand-color-light)' : 'transparent' }}
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
  highlightInvoiceNo?: string | null
  clearHighlightInvoiceNo?: () => void
  onNew: () => void
  onEdit: (id: string) => void
  onSettings: () => void
  isMobile?: boolean
}

export default function InvoicesPage({ c, isDark, highlightInvoiceNo, clearHighlightInvoiceNo, onNew, onEdit, onSettings, isMobile: propIsMobile }: Props) {
  const { toast } = useToast()
  const [isMobile, setIsMobile] = useState(() => {
    if (propIsMobile !== undefined) return propIsMobile
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
  })

  useEffect(() => {
    if (propIsMobile !== undefined) {
      setIsMobile(propIsMobile)
      return
    }
    const media = window.matchMedia('(max-width: 900px)')
    const listener = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [propIsMobile])

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [deletedInvoices, setDeletedInvoices] = useState<Invoice[]>([])
  const [showRecycleBin, setShowRecycleBin] = useState(false)
  const [retentionHours, setRetentionHours] = useState(24)
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(() => {
    return localStorage.getItem('nextiom_invoices_status_filter') || 'all'
  })
  const [customerFilter, setCustomerFilter] = useState(() => {
    return localStorage.getItem('nextiom_invoices_customer_filter') || 'all'
  })
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [calFilter, setCalFilter] = useState<CalFilter>({ mode: 'none' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [reviewInvoice, setReviewInvoice] = useState<Invoice | null>(null)
  const [timelineInvoice, setTimelineInvoice] = useState<Invoice | null>(null)
  const [refundInvoice, setRefundInvoice] = useState<Invoice | null>(null)
  const [checkedIds, setCheckedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nextiom_checked_invoices')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const getRemainingTime = (deletedAtStr: string) => {
    const deletedAt = new Date(deletedAtStr).getTime()
    const now = new Date().getTime()
    const diffMs = (deletedAt + retentionHours * 60 * 60 * 1000) - now
    if (diffMs <= 0) return 'Expiring soon'
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m left`
    }
    return `${diffMins}m left`
  }

  const handleToggleCheck = (id: string, checked: boolean) => {
    setCheckedIds(prev => {
      const next = checked ? [...prev, id] : prev.filter(x => x !== id)
      localStorage.setItem('nextiom_checked_invoices', JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('admin-invoices-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        () => {
          load()
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (highlightInvoiceNo && invoices.length > 0) {
      const found = invoices.find(inv => inv.invoice_no.toLowerCase() === highlightInvoiceNo.toLowerCase())
      if (found) {
        setSearch('')
        setStatusFilter('all')
        setCustomerFilter('all')
        setCalFilter({ mode: 'none' })
        setCheckedIds([])
      }
    }
  }, [highlightInvoiceNo, invoices])

  useEffect(() => {
    if (highlightInvoiceNo && !loading && invoices.length > 0) {
      const found = invoices.find(inv => inv.invoice_no.toLowerCase() === highlightInvoiceNo.toLowerCase())
      if (found) {
        const timer = setTimeout(() => {
          const element = document.getElementById(`invoice-row-${found.invoice_no}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 300)
        return () => clearTimeout(timer)
      }
    }
  }, [highlightInvoiceNo, loading, invoices])

  async function load() {
    setLoading(true)
    try {
      const [allData, settings] = await Promise.all([
        getInvoices(true),
        getInvoiceSettings()
      ])
      setRetentionHours(settings.recycle_bin_retention_hours ?? 24)
      const todayStr = getLocalDateString()
      
      const mappedActive = allData
        .filter(inv => !inv.deleted_at)
        .map(inv => {
          const cleanDueDate = inv.due_date ? inv.due_date.substring(0, 10) : ''
          if (inv.status !== 'paid' && inv.status !== 'payment_submitted' && inv.status !== 'ongoing' && cleanDueDate && cleanDueDate < todayStr) {
            return { ...inv, status: 'overdue' as const }
          }
          return inv
        })

      const mappedDeleted = allData
        .filter(inv => !!inv.deleted_at)
        .map(inv => {
          const cleanDueDate = inv.due_date ? inv.due_date.substring(0, 10) : ''
          if (inv.status !== 'paid' && inv.status !== 'payment_submitted' && inv.status !== 'ongoing' && cleanDueDate && cleanDueDate < todayStr) {
            return { ...inv, status: 'overdue' as const }
          }
          return inv
        })

      setInvoices(mappedActive)
      setDeletedInvoices(mappedDeleted)
    }
    catch { toast({ title: 'Failed to load invoices', variant: 'destructive' }) }
    finally { setLoading(false) }
  }

  const uniqueClients = useMemo(() => {
    const clients = new Set<string>()
    invoices.forEach(inv => {
      if (inv.client_name) {
        clients.add(inv.client_name)
      }
    })
    return Array.from(clients).sort()
  }, [invoices])

  const filtered = useMemo(() => {
    let arr = invoices.filter(inv => {
      const q = search.toLowerCase()
      const matchQ = !q || inv.invoice_no.toLowerCase().includes(q)
        || inv.client_name.toLowerCase().includes(q)
        || (inv.client_company ?? '').toLowerCase().includes(q)
        || (inv.service_name ?? '').toLowerCase().includes(q)
      const matchS = statusFilter === 'all' || inv.status === statusFilter
      const matchC = customerFilter === 'all' || inv.client_name === customerFilter
      if (!matchQ || !matchS || !matchC) return false
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

    if (checkedIds.length > 0 && !search.trim()) {
      arr = arr.filter(inv => checkedIds.includes(inv.id!))
    }

    arr.sort((a, b) => {
      const da = a.invoice_date ? new Date(a.invoice_date).getTime() : 0
      const db = b.invoice_date ? new Date(b.invoice_date).getTime() : 0
      return sortDir === 'asc' ? da - db : db - da
    })
    return arr
  }, [invoices, search, statusFilter, customerFilter, calFilter, sortDir, checkedIds])

  const totalBilled = formatCurrencyBreakdown(invoices)
  const totalPaid = formatCollectedCurrencyBreakdown(invoices)
  const totalOverdue = formatCurrencyBreakdown(invoices.filter(i => i.status === 'overdue'))

  async function handleDelete() {
    if (!deleteId) return
    try {
      const invoiceToDelete = invoices.find(i => i.id === deleteId)
      await deleteInvoice(deleteId)
      setInvoices(p => p.filter(i => i.id !== deleteId))
      if (invoiceToDelete) {
        setDeletedInvoices(p => [
          { ...invoiceToDelete, deleted_at: new Date().toISOString() },
          ...p
        ])
      }
      toast({ title: 'Invoice moved to recycle bin' })
    } catch { toast({ title: 'Failed to delete', variant: 'destructive' }) }
    finally { setDeleteId(null) }
  }

  async function handlePermanentDelete() {
    if (!permanentDeleteId) return
    try {
      await permanentlyDeleteInvoice(permanentDeleteId)
      setDeletedInvoices(p => p.filter(i => i.id !== permanentDeleteId))
      toast({ title: 'Invoice permanently deleted' })
    } catch { toast({ title: 'Failed to delete invoice permanently', variant: 'destructive' }) }
    finally { setPermanentDeleteId(null) }
  }

  async function handleRestore(id: string) {
    try {
      const restored = deletedInvoices.find(i => i.id === id)
      await restoreInvoice(id)
      setDeletedInvoices(p => p.filter(i => i.id !== id))
      if (restored) {
        const { deleted_at, ...activeRestored } = restored
        setInvoices(p => [activeRestored, ...p])
      }
      toast({ title: 'Invoice restored successfully' })
    } catch { toast({ title: 'Failed to restore invoice', variant: 'destructive' }) }
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

  const pulseStyle = `
    @keyframes invoice-highlight-pulse {
      0% {
        background-color: ${c.card};
        border-color: ${c.border};
        box-shadow: 0 0 0 rgba(232, 123, 53, 0);
      }
      50% {
        background-color: ${isDark ? 'rgba(232, 123, 53, 0.18)' : 'rgba(232, 123, 53, 0.12)'};
        border-color: ${c.brand};
        box-shadow: 0 0 12px rgba(232, 123, 53, 0.35);
      }
      100% {
        background-color: ${c.card};
        border-color: ${c.border};
        box-shadow: 0 0 0 rgba(232, 123, 53, 0);
      }
    }
  `

  return (
    <div>
      <style>{pulseStyle}</style>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 16, marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: c.text }}>{showRecycleBin ? 'Recycle Bin' : 'Invoices'}</h2>
          <p style={{ fontSize: 13, color: c.subText, marginTop: 2 }}>
            {showRecycleBin 
              ? `Restore deleted invoices or delete them permanently (auto-purges after ${retentionHours} hours)` 
              : 'Manage and track all client invoices'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          {!showRecycleBin && (
            <>
              <button onClick={() => setShowRecycleBin(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', border: `1px solid ${c.border}`, background: c.card, color: c.subText, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', flex: isMobile ? 1 : 'none' }}>
                <Trash2 size={15} /> {!isMobile && 'Recycle Bin'} {deletedInvoices.length > 0 && `(${deletedInvoices.length})`}
              </button>
              <button onClick={onSettings} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', border: `1px solid ${c.border}`, background: c.card, color: c.subText, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', flex: isMobile ? 1 : 'none' }}>
                <Settings size={15} /> {!isMobile && 'Settings'}
              </button>
              <button onClick={onNew} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', background: c.brand, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', flex: isMobile ? 1.5 : 'none' }}>
                <Plus size={15} /> New Invoice
              </button>
            </>
          )}
          {showRecycleBin && (
            <button onClick={() => setShowRecycleBin(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', border: `1px solid ${c.border}`, background: c.card, color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', width: isMobile ? '100%' : 'auto' }}>
              <ChevronLeft size={15} /> Back to Invoices
            </button>
          )}
        </div>
      </div>

      {showRecycleBin ? (
        /* Recycle Bin List */
        <div>
          {loading ? (
            <div>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ height: 52, borderRadius: 10, background: c.hover, marginBottom: 8 }} />
              ))}
            </div>
          ) : deletedInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: c.subText, background: c.card, border: `1px solid ${c.border}`, borderRadius: 12 }}>
              <Trash2 size={40} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
              <p style={{ fontWeight: 500 }}>Recycle bin is empty</p>
            </div>
          ) : (
            <>
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {deletedInvoices.map(inv => {
                    const st = STATUS[inv.status] ?? STATUS.unpaid
                    return (
                      <div
                        key={inv.id}
                        style={{
                          background: c.card,
                          border: `1px solid ${c.border}`,
                          borderRadius: 12,
                          padding: 16,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => {
                          ((e.currentTarget as HTMLDivElement).style.borderColor = c.brand)
                        }}
                        onMouseLeave={e => {
                          ((e.currentTarget as HTMLDivElement).style.borderColor = c.border)
                        }}
                      >
                        {/* Header Row: Inv No, Status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: c.subText }}>{inv.invoice_no}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap' }}>{st.label}</span>
                        </div>

                        {/* Service Name & Client Info */}
                        <div>
                          <div style={{ fontSize: 11, color: c.subText, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>Service</div>
                          <div style={{ fontWeight: 500, fontSize: 14, color: c.text }}>{inv.service_name || '—'}</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 11, color: c.subText, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>Client</div>
                            <div style={{ fontWeight: 500, fontSize: 13, color: c.text }}>{inv.client_name}</div>
                            {inv.client_company && <div style={{ fontSize: 11, color: c.subText }}>{inv.client_company}</div>}
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: c.subText, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>Remaining Time</div>
                            <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 500 }}>
                              {inv.deleted_at ? getRemainingTime(inv.deleted_at) : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Pricing Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, padding: '8px 0' }}>
                          <span style={{ fontSize: 13, color: c.subText }}>Total Amount</span>
                          <span style={{ fontWeight: 700, fontSize: 15, color: c.text }}>{fmtCurrency(inv.total, invoiceCurrency(inv))}</span>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button onClick={() => handleRestore(inv.id!)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: '#3b82f6', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }} title="Restore Invoice">
                            <RotateCcw size={14} /> Restore
                          </button>
                          <button onClick={() => setPermanentDeleteId(inv.id!)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }} title="Delete Permanently">
                            <Trash2 size={14} /> Delete Permanently
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '85px 1.2fr 1.5fr 100px 115px 140px 95px', gap: 12, padding: '0 14px 8px', fontSize: 11, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <span>Invoice</span><span>Service</span><span>Client</span><span>Total</span><span>Status</span><span>Remaining Time</span><span></span>
                  </div>
                  {deletedInvoices.map(inv => {
                    const st = STATUS[inv.status] ?? STATUS.unpaid
                    return (
                      <div
                        key={inv.id}
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '85px 1.2fr 1.5fr 100px 115px 140px 95px', 
                          gap: 12, 
                          alignItems: 'center', 
                          padding: '12px 14px', 
                          background: c.card, 
                          border: `1px solid ${c.border}`, 
                          borderRadius: 10, 
                          marginBottom: 6, 
                          transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => {
                          ((e.currentTarget as HTMLDivElement).style.borderColor = c.brand)
                        }}
                        onMouseLeave={e => {
                          ((e.currentTarget as HTMLDivElement).style.borderColor = c.border)
                        }}
                      >
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: c.subText }}>{inv.invoice_no}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {inv.service_name || '—'}
                          </div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.client_name}</div>
                          {inv.client_company && <div style={{ fontSize: 11, color: c.subText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.client_company}</div>}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{fmtCurrency(inv.total, invoiceCurrency(inv))}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, padding: '3px 8px', borderRadius: 6, width: 'fit-content', whiteSpace: 'nowrap' as const }}>{st.label}</span>
                        <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 500 }}>
                          {inv.deleted_at ? getRemainingTime(inv.deleted_at) : '—'}
                        </span>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => handleRestore(inv.id!)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px 5px', borderRadius: 6, display: 'flex' }} title="Restore Invoice">
                            <RotateCcw size={14} />
                          </button>
                          <button onClick={() => setPermanentDeleteId(inv.id!)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px 5px', borderRadius: 6, display: 'flex' }} title="Delete Permanently">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </>
          )}
        </div>
      ) : (
        /* Regular Invoices View */
        <>
          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 260px', gap: 16, alignItems: 'start' }}>
            {/* Left: filters + list */}
            <div>
              {/* Filters */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexDirection: isMobile ? 'column' : 'row', width: '100%' }}>
                <div style={{ position: 'relative', width: '100%', flex: isMobile ? 'none' : 1 }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.subText, pointerEvents: 'none' }} />
                  <input style={{ ...inp, paddingLeft: 30, width: '100%' }} placeholder="Search by client, company, or invoice no…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                  <select
                    value={statusFilter}
                    onChange={e => {
                      setStatusFilter(e.target.value)
                      localStorage.setItem('nextiom_invoices_status_filter', e.target.value)
                    }}
                    style={{ ...inp, width: isMobile ? 'auto' : 160, flex: isMobile ? 1 : 'none', cursor: 'pointer' }}
                  >
                    <option value="all">All status</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="overdue">Overdue</option>
                    <option value="payment_submitted">Pending Review</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="refunded">Refunded</option>
                    <option value="partially_refunded">Partially Refunded</option>
                    <option value="ongoing">On Going</option>
                  </select>
                  <select
                    value={customerFilter}
                    onChange={e => {
                      setCustomerFilter(e.target.value)
                      localStorage.setItem('nextiom_invoices_customer_filter', e.target.value)
                    }}
                    style={{ ...inp, width: isMobile ? 'auto' : 180, flex: isMobile ? 1 : 'none', cursor: 'pointer' }}
                  >
                    <option value="all">All customers</option>
                    {uniqueClients.map(client => (
                      <option key={client} value={client}>{client}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                    title={sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 12px', border: `1px solid ${c.borderStrong}`, background: isDark ? '#22252C' : '#fff', color: c.subText, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}
                  >
                    <ArrowUpDown size={13} /> {sortDir === 'desc' ? 'Newest' : 'Oldest'}
                  </button>
                </div>
              </div>

              {checkedIds.length > 0 && !search.trim() && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: isDark ? 'rgba(232, 123, 53, 0.12)' : 'rgba(232, 123, 53, 0.08)',
                  border: `1.5px solid ${c.brandLight || 'rgba(232, 123, 53, 0.2)'}`,
                  borderRadius: 8,
                  marginBottom: 14,
                  fontSize: 12,
                  color: c.text
                }}>
                  <span>
                    Showing only <strong>{checkedIds.length}</strong> checked {checkedIds.length === 1 ? 'invoice' : 'invoices'}. Other invoices are hidden until you uncheck them.
                  </span>
                  <button
                    onClick={() => {
                      setCheckedIds([])
                      localStorage.removeItem('nextiom_checked_invoices')
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: c.brand,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 12,
                      padding: '2px 6px',
                      fontFamily: 'inherit'
                    }}
                  >
                    Clear all
                  </button>
                </div>
              )}

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
                  {isMobile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {filtered.map(inv => {
                        const st = STATUS[inv.status] ?? STATUS.unpaid
                        const isHighlighted = !!(highlightInvoiceNo && inv.invoice_no.toLowerCase() === highlightInvoiceNo.toLowerCase())
                        const isSettled = inv.status === 'paid' || inv.status === 'refunded' || inv.status === 'partially_refunded'
                        const paid = Number(inv.paid_amount || (isSettled ? inv.total : 0))
                        const refunded = Number(inv.refunded_amount || 0)
                        const netPaid = Math.max(0, paid - refunded)
                        const balance = isSettled ? 0 : Math.max(0, Number(inv.total || 0) - paid)
                        
                        return (
                          <div
                            key={inv.id}
                            id={`invoice-row-${inv.invoice_no}`}
                            style={{
                              background: c.card,
                              border: `1px solid ${isHighlighted ? c.brand : c.border}`,
                              borderRadius: 12,
                              padding: 16,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 12,
                              transition: 'border-color 0.15s, box-shadow 0.15s',
                              ...(isHighlighted ? {
                                animation: 'invoice-highlight-pulse 1.8s infinite ease-in-out',
                                position: 'relative',
                                zIndex: 10
                              } : {})
                            }}
                            onClick={() => {
                              if (isHighlighted && clearHighlightInvoiceNo) {
                                clearHighlightInvoiceNo()
                              }
                            }}
                            onMouseEnter={e => {
                              if (!isHighlighted) {
                                ((e.currentTarget as HTMLDivElement).style.borderColor = c.brand)
                              }
                            }}
                            onMouseLeave={e => {
                              if (!isHighlighted) {
                                ((e.currentTarget as HTMLDivElement).style.borderColor = c.border)
                              }
                            }}
                          >
                            {/* Header Row: Checkbox, Inv No, Status */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <input
                                  type="checkbox"
                                  checked={checkedIds.includes(inv.id!)}
                                  onChange={(e) => handleToggleCheck(inv.id!, e.target.checked)}
                                  style={{
                                    cursor: 'pointer',
                                    width: 15,
                                    height: 15,
                                    accentColor: c.brand,
                                  }}
                                />
                                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: c.subText }}>{inv.invoice_no}</span>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap' }}>{st.label}</span>
                            </div>

                            {/* Service Name */}
                            <div>
                              <div style={{ fontSize: 10, color: c.subText, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>Service</div>
                              <div style={{ fontWeight: 500, fontSize: 14, color: c.text }}>{inv.service_name || '—'}</div>
                            </div>

                            {/* Client details & Dates */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                              <div>
                                <div style={{ fontSize: 10, color: c.subText, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>Client</div>
                                <div style={{ fontWeight: 500, fontSize: 13, color: c.text }}>{inv.client_name}</div>
                                {inv.client_company && <div style={{ fontSize: 11, color: c.subText }}>{inv.client_company}</div>}
                              </div>
                              <div>
                                <div style={{ fontSize: 10, color: c.subText, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>Dates</div>
                                <div style={{ fontSize: 12, color: c.text }}>Issued: {inv.invoice_date}</div>
                                <div style={{ fontSize: 12, color: c.subText }}>Due: {inv.due_date ? inv.due_date.substring(0, 10) : '—'}</div>
                              </div>
                            </div>

                            {/* Financial figures */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, padding: '10px 0' }}>
                              <div>
                                <div style={{ fontSize: 11, color: c.subText }}>Total Amount</div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: c.text }}>{fmtCurrency(inv.total, invoiceCurrency(inv))}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: c.subText }}>Paid Amount</div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: netPaid > 0 ? '#22c55e' : c.subText }}>
                                  {fmtCurrency(netPaid, invoiceCurrency(inv))}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: c.subText }}>Balance</div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: balance > 0 ? '#ef4444' : c.subText }}>
                                  {fmtCurrency(balance, invoiceCurrency(inv))}
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                              {(inv.status === 'payment_submitted' || inv.invoice_payments?.some(p => p.slip_url)) && (
                                <button onClick={() => setReviewInvoice(inv)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: inv.status === 'payment_submitted' ? '#3b82f6' : 'rgba(59, 130, 246, 0.1)', border: inv.status === 'payment_submitted' ? 'none' : `1px solid rgba(59, 130, 246, 0.3)`, color: inv.status === 'payment_submitted' ? '#fff' : '#3b82f6', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }} title={inv.status === 'payment_submitted' ? "Review payment" : "View payment slip"}>
                                  <CreditCard size={14} /> {inv.status === 'payment_submitted' ? 'Review Payment' : 'View Slip'}
                                </button>
                              )}
                              {(inv.status === 'paid' || inv.status === 'partially_paid' || inv.status === 'partially_refunded') && (
                                <button onClick={() => setRefundInvoice(inv)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--brand-color-light)', border: 'none', color: 'var(--brand-color)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }} title="Refund">
                                  <RotateCcw size={14} /> Refund
                                </button>
                              )}
                              <button onClick={() => onEdit(inv.id!)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px solid ${c.border}`, color: c.text, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }} title="Edit">
                                <Edit3 size={14} /> Edit
                              </button>
                              <button onClick={() => setTimelineInvoice(inv)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px solid ${c.border}`, color: c.text, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }} title="History / Timeline">
                                <Clock size={14} /> History
                              </button>
                              <button onClick={() => setDeleteId(inv.id!)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }} title="Delete">
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '35px 85px 1.2fr 1.5fr 95px 95px 95px 80px 80px 105px 130px', gap: 12, padding: '0 14px 8px', fontSize: 11, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        <span></span><span>Invoice</span><span>Service</span><span>Client</span><span>Total</span><span>Paid</span><span>Balance</span>
                        <span style={{ textAlign: 'right' }}>Date</span><span style={{ textAlign: 'right' }}>Due Date</span><span>Status</span><span></span>
                      </div>
                      {filtered.map(inv => {
                        const st = STATUS[inv.status] ?? STATUS.unpaid
                        const isHighlighted = !!(highlightInvoiceNo && inv.invoice_no.toLowerCase() === highlightInvoiceNo.toLowerCase())
                        return (
                          <div
                            key={inv.id}
                            id={`invoice-row-${inv.invoice_no}`}
                            style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '35px 85px 1.2fr 1.5fr 95px 95px 95px 80px 80px 105px 130px', 
                              gap: 12, 
                              alignItems: 'center', 
                              padding: '12px 14px', 
                              background: c.card, 
                              border: `1px solid ${isHighlighted ? c.brand : c.border}`, 
                              borderRadius: 10, 
                              marginBottom: 6, 
                              transition: 'border-color 0.15s, box-shadow 0.15s',
                              ...(isHighlighted ? {
                                animation: 'invoice-highlight-pulse 1.8s infinite ease-in-out',
                                position: 'relative',
                                zIndex: 10
                              } : {})
                            }}
                            onClick={() => {
                              if (isHighlighted && clearHighlightInvoiceNo) {
                                clearHighlightInvoiceNo()
                              }
                            }}
                            onMouseEnter={e => {
                              if (!isHighlighted) {
                                ((e.currentTarget as HTMLDivElement).style.borderColor = c.brand)
                              }
                            }}
                            onMouseLeave={e => {
                              if (!isHighlighted) {
                                ((e.currentTarget as HTMLDivElement).style.borderColor = c.border)
                              }
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <input
                                type="checkbox"
                                checked={checkedIds.includes(inv.id!)}
                                onChange={(e) => handleToggleCheck(inv.id!, e.target.checked)}
                                style={{
                                  cursor: 'pointer',
                                  width: 14,
                                  height: 14,
                                  accentColor: c.brand,
                                }}
                              />
                            </div>
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
                            {(() => {
                              const isSettled = inv.status === 'paid' || inv.status === 'refunded' || inv.status === 'partially_refunded'
                              const paid = Number(inv.paid_amount || (isSettled ? inv.total : 0))
                              const refunded = Number(inv.refunded_amount || 0)
                              const netPaid = Math.max(0, paid - refunded)
                              const balance = isSettled ? 0 : Math.max(0, Number(inv.total || 0) - paid)
                              return (
                                <>
                                  <span style={{ fontWeight: 600, fontSize: 13, color: netPaid > 0 ? '#22c55e' : c.subText }}>
                                    {fmtCurrency(netPaid, invoiceCurrency(inv))}
                                  </span>
                                  <span style={{ fontWeight: 600, fontSize: 13, color: balance > 0 ? '#ef4444' : c.subText }}>
                                    {fmtCurrency(balance, invoiceCurrency(inv))}
                                  </span>
                                </>
                              )
                            })()}
                            <span style={{ fontSize: 12, color: c.subText, textAlign: 'right' }}>{inv.invoice_date}</span>
                            <span style={{ fontSize: 12, color: c.subText, textAlign: 'right' }}>{inv.due_date ? inv.due_date.substring(0, 10) : '—'}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' as const }}>{st.label}</span>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                              {(inv.status === 'payment_submitted' || inv.invoice_payments?.some(p => p.slip_url)) && (
                                <button onClick={() => setReviewInvoice(inv)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px 5px', borderRadius: 6, display: 'flex' }} title={inv.status === 'payment_submitted' ? "Review payment" : "View payment slip"}>
                                  <CreditCard size={14} />
                                </button>
                              )}
                              {(inv.status === 'paid' || inv.status === 'partially_paid' || inv.status === 'partially_refunded') && (
                                <button onClick={() => setRefundInvoice(inv)} style={{ background: 'none', border: 'none', color: 'var(--brand-color)', cursor: 'pointer', padding: '4px 5px', borderRadius: 6, display: 'flex' }} title="Refund">
                                  <RotateCcw size={14} />
                                </button>
                              )}
                              <button onClick={() => onEdit(inv.id!)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: '4px 5px', borderRadius: 6, display: 'flex' }} title="Edit">
                                <Edit3 size={14} />
                              </button>
                              <button onClick={() => setTimelineInvoice(inv)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: '4px 5px', borderRadius: 6, display: 'flex' }} title="History / Timeline">
                                <Clock size={14} />
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
        </>
      )}

      {reviewInvoice && (
        <PaymentReviewDialog
          invoice={reviewInvoice}
          c={c}
          isDark={isDark}
          onClose={() => setReviewInvoice(null)}
          onChanged={load}
        />
      )}

      {timelineInvoice && (
        <TimelineDrawer
          invoice={timelineInvoice}
          c={c}
          isDark={isDark}
          onClose={() => setTimelineInvoice(null)}
        />
      )}

      {refundInvoice && (
        <RefundDialog
          invoice={refundInvoice}
          c={c}
          isDark={isDark}
          onClose={() => setRefundInvoice(null)}
          onChanged={load}
        />
      )}

      {/* Delete confirm dialog */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: 28, width: 'calc(100% - 32px)', maxWidth: 380, margin: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: c.text }}>Move to Recycle Bin?</h3>
            <p style={{ fontSize: 13, color: c.subText, marginBottom: 22 }}>This invoice will be moved to the recycle bin. It can be restored within the configured retention period before being permanently deleted.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: '8px 18px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleDelete} style={{ padding: '8px 18px', background: c.brand, border: 'none', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>Move to Bin</button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete confirm dialog */}
      {permanentDeleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: 28, width: 'calc(100% - 32px)', maxWidth: 380, margin: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: c.text }}>Permanently delete this invoice?</h3>
            <p style={{ fontSize: 13, color: c.subText, marginBottom: 22 }}>This action cannot be undone. The invoice and all associated data will be permanently deleted from the database.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setPermanentDeleteId(null)} style={{ padding: '8px 18px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handlePermanentDelete} style={{ padding: '8px 18px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
