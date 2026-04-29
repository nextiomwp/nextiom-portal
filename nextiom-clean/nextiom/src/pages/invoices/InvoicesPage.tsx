import React, { useState, useEffect } from 'react'
import { Plus, Search, FileText, TrendingUp, CheckCircle, AlertCircle, Edit3, Trash2, Settings } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Invoice, getInvoices, deleteInvoice, fmtLKR } from '@/lib/invoices'

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  paid:    { label: 'Paid',    color: '#22c55e', bg: 'rgba(34,197,94,0.13)' },
  unpaid:  { label: 'Unpaid',  color: '#f59e0b', bg: 'rgba(245,158,11,0.13)' },
  overdue: { label: 'Overdue', color: '#ef4444', bg: 'rgba(239,68,68,0.13)' },
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
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setInvoices(await getInvoices()) }
    catch { toast({ title: 'Failed to load invoices', variant: 'destructive' }) }
    finally { setLoading(false) }
  }

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase()
    const matchQ = !q || inv.invoice_no.toLowerCase().includes(q)
      || inv.client_name.toLowerCase().includes(q)
      || (inv.client_company ?? '').toLowerCase().includes(q)
    const matchS = statusFilter === 'all' || inv.status === statusFilter
    return matchQ && matchS
  })

  const totalBilled = invoices.reduce((s, i) => s + i.total, 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const totalOutstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0)

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
    fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const metrics = [
    { label: 'Total invoices', value: String(invoices.length), Icon: FileText,   color: c.text },
    { label: 'Total billed',   value: fmtLKR(totalBilled),     Icon: TrendingUp,  color: '#378ADD' },
    { label: 'Collected',      value: fmtLKR(totalPaid),        Icon: CheckCircle, color: '#639922' },
    { label: 'Outstanding',    value: fmtLKR(totalOutstanding), Icon: AlertCircle, color: '#BA7517' },
  ]

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

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.subText, pointerEvents: 'none' }} />
          <input style={{ ...inp, paddingLeft: 32 }} placeholder="Search by client, company, or invoice no…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inp, width: 140, cursor: 'pointer' }}>
          <option value="all">All status</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="overdue">Overdue</option>
        </select>
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
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 155px 90px 80px 52px', gap: 8, padding: '0 14px 8px', fontSize: 11, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <span>Invoice</span><span>Client</span><span>Amount</span>
            <span style={{ textAlign: 'right' }}>Date</span><span></span><span></span>
          </div>
          {filtered.map(inv => {
            const st = STATUS[inv.status] ?? STATUS.unpaid
            return (
              <div
                key={inv.id}
                style={{ display: 'grid', gridTemplateColumns: '110px 1fr 155px 90px 80px 52px', gap: 8, alignItems: 'center', padding: '12px 14px', background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, marginBottom: 6, transition: 'border-color 0.15s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = c.brand)}
                onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = c.border)}
              >
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: c.subText }}>{inv.invoice_no}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.client_name}</div>
                  {inv.client_company && <div style={{ fontSize: 11, color: c.subText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.client_company}</div>}
                </div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{fmtLKR(inv.total)}</span>
                <span style={{ fontSize: 12, color: c.subText, textAlign: 'right' }}>{inv.invoice_date}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>{st.label}</span>
                <div style={{ display: 'flex', gap: 2 }}>
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
