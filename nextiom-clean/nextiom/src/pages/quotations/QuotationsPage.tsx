// src/pages/quotations/QuotationsPage.tsx

import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Search, FileText, Calendar, Edit3, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, Eye } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Quotation, getQuotations, getQuotation, deleteQuotation, fmtCurrency, updateQuotationStatus } from '@/lib/quotations'
import { getPublicInvoiceSettings } from '@/lib/invoices'

function dayKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }

interface CalFilter { mode: 'none' | 'month' | 'day'; year?: number; month?: number; day?: number }

function CalendarWidget({ quotations, calFilter, onDayClick, onMonthClick, c, isDark }: {
  quotations: Quotation[]; calFilter: CalFilter; onDayClick: (y: number | null, m?: number, d?: number) => void;
  onMonthClick: (y: number, m: number) => void; c: any; isDark: boolean
}) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const firstDay = new Date(viewYear, viewMonth, 1)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startDow = firstDay.getDay()

  const parsedDates = useMemo(() =>
    quotations.map(q => q.quotation_date ? new Date(q.quotation_date) : null).filter(Boolean) as Date[]
  , [quotations])

  const quotationDayKeys = new Set(parsedDates.map(d => dayKey(d)))
  const isMonthFiltered = calFilter.mode === 'month' && calFilter.year === viewYear && calFilter.month === viewMonth
  const todayKey = dayKey(today)

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  let footerText = 'All quotations shown'
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
            const hasQuotation = quotationDayKeys.has(cellKey)
            const isSelected = calFilter.mode === 'day' && calFilter.year === viewYear && calFilter.month === viewMonth && calFilter.day === day
            const isMonthTinted = calFilter.mode === 'month' && calFilter.year === viewYear && calFilter.month === viewMonth
            return (
              <div key={idx}
                onClick={() => onDayClick(viewYear, viewMonth, day)}
                style={{
                  textAlign: 'center', borderRadius: 6, padding: '4px 0', cursor: 'pointer', position: 'relative',
                  background: isSelected ? c.brand : isMonthTinted ? 'var(--brand-color-light)' : 'transparent',
                  color: isSelected ? '#fff' : hasQuotation ? c.text : c.subText,
                  fontWeight: hasQuotation || isToday ? 700 : 400,
                  fontSize: 11,
                  border: isToday && !isSelected ? `1.5px dashed ${c.brand}` : '1.5px solid transparent',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? c.brand : isMonthTinted ? 'var(--brand-color-light)' : 'transparent' }}
              >
                {day}
                {hasQuotation && !isSelected && (
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
}

export default function QuotationsPage({ c, isDark, onNew, onEdit }: Props) {
  const { toast } = useToast()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [calFilter, setCalFilter] = useState<CalFilter>({ mode: 'none' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteNo, setDeleteNo] = useState<string>('')
  const [page, setPage] = useState(1)
  const limit = 10

  const loadData = async () => {
    setLoading(true)
    try {
      const q = await getQuotations()
      setQuotations(q)
    } catch {
      toast({ title: 'Failed to load quotations', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteQuotation(deleteId)
      toast({ title: `Quotation ${deleteNo} deleted` })
      setQuotations(prev => prev.filter(q => q.id !== deleteId))
    } catch {
      toast({ title: 'Failed to delete quotation', variant: 'destructive' })
    } finally {
      setDeleteId(null)
      setDeleteNo('')
    }
  }

  const handlePrint = async (q: Quotation) => {
    try {
      toast({ title: 'Preparing print document…' })
      const fullQuotation = await getQuotation(q.id!)
      if (!fullQuotation) throw new Error('Quotation not found')

      const settings = await getPublicInvoiceSettings()
      localStorage.setItem('nxt_quotation_print', JSON.stringify({
        ...fullQuotation,
        settings
      }))
      window.open('/quotations/print', '_blank')
    } catch (err) {
      toast({ title: 'Failed to prepare print document', variant: 'destructive' })
    }
  }

  const filtered = useMemo(() => {
    let list = [...quotations]

    // search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(item => 
        item.quotation_no.toLowerCase().includes(q) ||
        item.client_name.toLowerCase().includes(q) ||
        (item.client_company && item.client_company.toLowerCase().includes(q))
      )
    }

    // calendar filter
    if (calFilter.mode === 'day') {
      list = list.filter(item => {
        const d = item.quotation_date ? new Date(item.quotation_date) : null
        if (!d) return false
        return d.getFullYear() === calFilter.year && d.getMonth() === calFilter.month && d.getDate() === calFilter.day
      })
    } else if (calFilter.mode === 'month') {
      list = list.filter(item => {
        const d = item.quotation_date ? new Date(item.quotation_date) : null
        if (!d) return false
        return d.getFullYear() === calFilter.year && d.getMonth() === calFilter.month
      })
    }

    // sorting
    list.sort((a, b) => {
      const da = a.quotation_date ? new Date(a.quotation_date).getTime() : 0
      const db = b.quotation_date ? new Date(b.quotation_date).getTime() : 0
      return sortDir === 'asc' ? da - db : db - da
    })

    return list
  }, [quotations, search, calFilter, sortDir])

  const totalPages = Math.ceil(filtered.length / limit) || 1
  const paginated = useMemo(() => {
    const start = (page - 1) * limit
    return filtered.slice(start, start + limit)
  }, [filtered, page])

  useEffect(() => { setPage(1) }, [search, calFilter])

  const cardStyle = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }
  const inp: React.CSSProperties = {
    padding: '8px 12px', border: `1px solid ${c.borderStrong}`, borderRadius: 8,
    color: c.text, fontSize: 13, background: isDark ? '#22252C' : '#fff',
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const,
  }

  const totalsBreakdown = useMemo(() => {
    const totals = quotations.reduce<Record<string, number>>((acc, q) => {
      const cur = q.currency === 'USD' ? 'USD' : 'LKR'
      acc[cur] = (acc[cur] || 0) + (q.total || 0)
      return acc
    }, { LKR: 0, USD: 0 })
    return Object.keys(totals)
      .filter(k => totals[k] > 0)
      .map(k => fmtCurrency(totals[k], k as any))
      .join(' / ') || fmtCurrency(0, 'LKR')
  }, [quotations])

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
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: c.text }}>Quotations</h2>
          <p style={{ fontSize: 13, color: c.subText, marginTop: 2 }}>Manage client quotation requests and estimates</p>
        </div>
        <button onClick={onNew} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: c.brand, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
          <Plus size={15} /> New Quotation
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Quotations</span>
            <FileText size={16} color={c.brand} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: c.text }}>{quotations.length}</div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: c.subText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Gross Volume</span>
            <Calendar size={16} color="#22c55e" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: c.text, fontFamily: 'JetBrains Mono, monospace' }}>{totalsBreakdown}</div>
        </div>
      </div>

      {/* Two-column layout: list + calendar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, alignItems: 'start' }}>
        {/* Left column: search, sorting, list */}
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.subText, pointerEvents: 'none' }} />
              <input style={{ ...inp, paddingLeft: 30, width: '100%' }} placeholder="Search by client, company, or quotation no…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button
              onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
              title={sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', border: `1px solid ${c.borderStrong}`, background: isDark ? '#22252C' : '#fff', color: c.subText, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
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
              <p style={{ fontWeight: 500 }}>{quotations.length === 0 ? 'No quotations yet' : 'No quotations match your search'}</p>
              {quotations.length === 0 && (
                <button onClick={onNew} style={{ marginTop: 16, padding: '8px 16px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
                  <Plus size={14} /> Create first quotation
                </button>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 130px 90px 130px 110px', gap: 8, padding: '0 14px 8px', fontSize: 11, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <span>Quotation</span><span>Client</span><span>Amount</span>
                <span style={{ textAlign: 'right' }}>Date</span><span>Status</span><span></span>
              </div>
              {paginated.map(q => {
                const isExpired = q.valid_until && new Date(q.valid_until + 'T23:59:59') < new Date()
                return (
                  <div
                    key={q.id}
                    style={{ display: 'grid', gridTemplateColumns: '110px 1fr 130px 90px 130px 110px', gap: 8, alignItems: 'center', padding: '12px 14px', background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, marginBottom: 6, transition: 'border-color 0.15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = c.brand)}
                    onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = c.border)}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: c.subText }}>{q.quotation_no}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.client_name}</div>
                      {q.client_company && <div style={{ fontSize: 11, color: c.subText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.client_company}</div>}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{fmtCurrency(q.total, q.currency ?? 'LKR')}</span>
                      {isExpired ? (
                        <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, marginTop: 2 }}>Expired</div>
                      ) : (
                        <div style={{ fontSize: 10, color: c.subText, marginTop: 2 }}>Valid to {q.valid_until}</div>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: c.subText, textAlign: 'right' }}>{q.quotation_date}</span>
                    <div>
                      <select
                        value={q.status || 'active'}
                        onChange={async (e) => {
                          const newStatus = e.target.value
                          try {
                            await updateQuotationStatus(q.id!, newStatus)
                            setQuotations(prev => prev.map(item => item.id === q.id ? { ...item, status: newStatus } : item))
                            toast({ title: 'Quotation status updated' })
                          } catch {
                            toast({ title: 'Failed to update status', variant: 'destructive' })
                          }
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: 12,
                          cursor: 'pointer',
                          background: q.status === 'accepted' ? 'rgba(34,197,94,0.15)' : q.status === 'declined' ? 'rgba(239,68,68,0.15)' : q.status === 'expired' ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') : 'var(--brand-color-light)',
                          color: q.status === 'accepted' ? '#22c55e' : q.status === 'declined' ? '#ef4444' : q.status === 'expired' ? c.subText : c.brand,
                          border: 'none',
                          fontWeight: 700,
                          borderRadius: 6,
                          outline: 'none',
                          width: '100%',
                          maxWidth: 110,
                          fontFamily: 'inherit',
                        }}
                      >
                        <option value="active" style={{ background: isDark ? '#1C1E24' : '#fff', color: c.text }}>Active</option>
                        <option value="accepted" style={{ background: isDark ? '#1C1E24' : '#fff', color: c.text }}>Accepted</option>
                        <option value="declined" style={{ background: isDark ? '#1C1E24' : '#fff', color: c.text }}>Declined</option>
                        <option value="expired" style={{ background: isDark ? '#1C1E24' : '#fff', color: c.text }}>Expired</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <button onClick={() => handlePrint(q)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: '4px 5px', borderRadius: 6, display: 'flex' }} title="Preview / PDF">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => onEdit(q.id!)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: '4px 5px', borderRadius: 6, display: 'flex' }} title="Edit">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => { setDeleteId(q.id!); setDeleteNo(q.quotation_no) }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px 5px', borderRadius: 6, display: 'flex' }} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: c.subText }}>
                    Showing {limit * (page - 1) + 1} to {Math.min(limit * page, filtered.length)} of {filtered.length} quotations
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      style={{
                        padding: '5px 10px', border: `1px solid ${c.border}`, background: 'transparent',
                        color: c.text, borderRadius: 6, cursor: page === 1 ? 'not-allowed' : 'pointer',
                        fontSize: 12, opacity: page === 1 ? 0.5 : 1
                      }}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      style={{
                        padding: '5px 10px', border: `1px solid ${c.border}`, background: 'transparent',
                        color: c.text, borderRadius: 6, cursor: page === totalPages ? 'not-allowed' : 'pointer',
                        fontSize: 12, opacity: page === totalPages ? 0.5 : 1
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right column: calendar */}
        <CalendarWidget
          quotations={quotations}
          calFilter={calFilter}
          onDayClick={handleDayClick}
          onMonthClick={handleMonthClick}
          c={c}
          isDark={isDark}
        />
      </div>

      {/* Delete confirmation dialog */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: 28, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: c.text }}>Delete this quotation?</h3>
            <p style={{ fontSize: 13, color: c.subText, marginBottom: 22 }}>This action cannot be undone. The quotation {deleteNo} and all its line items will be permanently deleted.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setDeleteId(null); setDeleteNo('') }} style={{ padding: '8px 18px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleDelete} style={{ padding: '8px 18px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
