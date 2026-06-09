// src/pages/quotations/QuotationPrintPage.tsx
// This page is opened in a new tab via window.open('/quotations/print', '_blank')
// It reads print data from localStorage set by QuotationForm

import { useEffect, useState } from 'react'
import { Calendar, Info, CreditCard, PenTool, ThumbsUp, MapPin, Phone, Globe, User } from 'lucide-react'
import { fmtCurrency, QuotationCurrency } from '@/lib/quotations'
import { resolveLogoUrl } from '@/lib/invoices'

function formatPrintDate(value?: string) {
  if (!value) return ''
  return value.split('T')[0]
}

export default function QuotationPrintPage() {
  const [data, setData] = useState<any>(null)
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('nxt_quotation_print')
      if (raw) {
        const parsed = JSON.parse(raw)
        setData(parsed)
        // Keep it in localStorage so the user can refresh if needed, but we don't strictly need to clear it instantly
        if (parsed?.settings?.logo_url) {
          resolveLogoUrl(parsed.settings.logo_url).then(setLogoUrl)
        }
      }
    } catch {}
  }, [])

  if (!data) return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center', color: '#999' }}>
      Loading quotation…
    </div>
  )

  const { quotation_no, quotation_date, valid_until, client_name, client_company,
          client_phone, client_email, client_address, items, notes, total, settings: s, project_timeline } = data
  const currency: QuotationCurrency = data.currency === 'USD' ? 'USD' : 'LKR'
  const printQuotationDate = formatPrintDate(quotation_date)
  const printValidUntil = formatPrintDate(valid_until)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #f4f4f0; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #1f2937; }
        @page { size: A4; margin: 10mm 15mm 15mm 15mm; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-body { padding: 0 !important; margin: 0 !important; min-height: auto !important; }
          .quotation-wrap {
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 10px 20px !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ background: '#18181b', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ color: 'white', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
          Quotation {quotation_no} — {client_name}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => window.print()}
            style={{ padding: '8px 20px', background: '#E8650A', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}
          >
            Print / Save PDF
          </button>
          <button
            onClick={() => window.close()}
            style={{ padding: '8px 16px', background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Page */}
      <div className="print-body" style={{ padding: '36px 20px', minHeight: '100vh' }}>
        <div className="quotation-wrap" style={{
          maxWidth: 800,
          margin: '0 auto',
          background: 'white',
          padding: '48px 52px',
          borderRadius: 14,
          boxShadow: '0 8px 48px rgba(0,0,0,0.12)',
          fontFamily: "'DM Sans', sans-serif",
        }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              {logoUrl
                ? <img src={logoUrl} alt="logo" style={{ maxHeight: 52, maxWidth: 180, objectFit: 'contain', marginBottom: 12 }} />
                : <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: '#111827', marginBottom: 6 }}>{s?.company_name ?? 'Nextiom (Pvt) Ltd'}</div>
              }
              <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={13} style={{ color: '#E8650A' }} />
                  <span>{s?.address ?? 'Niwandama, Ja Ela – 11350'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={13} style={{ color: '#E8650A' }} />
                    <span>{s?.phone ?? '+94 70 203 2323'}</span>
                  </div>
                  <span style={{ color: '#d1d5db' }}>•</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Globe size={13} style={{ color: '#E8650A' }} />
                    <span>{s?.website ?? 'https://nextiom.com/'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14 }}>
              <div style={{ background: '#E8650A', color: 'white', padding: '10px 24px', borderRadius: 8, fontSize: 18, fontWeight: 700, letterSpacing: '0.05em' }}>
                {quotation_no}
              </div>
            </div>
          </div>

          {/* Quotation Title Banner */}
          <div style={{ borderBottom: '3px solid #E8650A', paddingBottom: 6, marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', letterSpacing: '0.05em' }}>QUOTATION</h1>
          </div>

          {/* Quoted To + Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40, marginBottom: 24 }}>
            {/* Quoted To Card */}
            <div style={{ background: '#f3f4f6', borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#E8650A', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <User size={14} />
                <span>Quoted To</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{client_name}</div>
              {client_company && <div style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{client_company}</div>}
              {client_phone && <div style={{ fontSize: 12, color: '#4b5563' }}>{client_phone}</div>}
              {client_email && <div style={{ fontSize: 12, color: '#4b5563' }}>{client_email}</div>}
              {client_address && <div style={{ fontSize: 12, color: '#4b5563', whiteSpace: 'pre-wrap', marginTop: 2 }}>{client_address}</div>}
            </div>

            {/* Quotation Details Table */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '8px 0', fontWeight: 600, color: '#374151' }}>Quotation No:</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: '#111827' }}>{quotation_no}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '8px 0', fontWeight: 600, color: '#374151' }}>Date:</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: '#111827' }}>{printQuotationDate}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: 600, color: '#374151' }}>Valid Until:</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', color: '#111827' }}>{printValidUntil}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ background: '#1f2937', color: 'white' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '6px 0 0 6px' }}>Description</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit Price</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '0 6px 6px 0' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#1f2937', fontWeight: 500 }}>{item.description}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, color: '#4b5563' }}>{item.qty}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, color: '#4b5563' }}>{fmtCurrency(item.unit_price, currency)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#111827' }}>{fmtCurrency(item.qty * item.unit_price, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Subtotal + Grand Total Summary Box */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
            <div style={{ width: 280, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: 13, color: '#4b5563' }}>
                <span>Subtotal</span>
                <span>{fmtCurrency(total, currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#E8650A', color: 'white', fontWeight: 700, fontSize: 15 }}>
                <span>Grand Total</span>
                <span>{fmtCurrency(total, currency)}</span>
              </div>
            </div>
          </div>

          {/* Bottom Columns: Project Timeline & Payment Terms */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20, marginBottom: 24 }}>
            {/* Timeline */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px', background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#E8650A', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                <Calendar size={15} />
                <span>Project Timeline</span>
              </div>
              <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 4 }}>Estimated Completion:</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{project_timeline || '14 Working Days'}</div>
            </div>

            {/* Payment Terms */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px', background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#E8650A', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                <Info size={15} />
                <span>Payment Terms</span>
              </div>
              <ul style={{ paddingLeft: 16, fontSize: 11.5, color: '#4b5563', lineHeight: 1.6 }}>
                <li>50% advance payment required before project commencement.</li>
                <li>Remaining 50% payable upon project completion.</li>
                <li>Additional features requested after approval will be quoted separately.</li>
                <li>Quotation valid for 30 days from issue date.</li>
              </ul>
            </div>
          </div>

          {/* Payment Method Card */}
          {s?.bank_name && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', background: '#fafafa', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#E8650A', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                <CreditCard size={15} />
                <span>Payment Method</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>Bank Transfer ({currency})</div>
                  <table style={{ width: '100%', fontSize: 11.5, color: '#4b5563', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '2px 0', fontWeight: 600 }}>Name</td>
                        <td style={{ padding: '2px 8px' }}>: &nbsp; {s.account_name}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '2px 0', fontWeight: 600 }}>Account Number</td>
                        <td style={{ padding: '2px 8px' }}>: &nbsp; {s.account_no}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '2px 0', fontWeight: 600 }}>Bank</td>
                        <td style={{ padding: '2px 8px' }}>: &nbsp; {s.bank_name}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '2px 0', fontWeight: 600 }}>Branch</td>
                        <td style={{ padding: '2px 8px' }}>: &nbsp; {s.bank_branch}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 20, borderLeft: '1px solid #e5e7eb' }}>
                  <PenTool size={24} style={{ color: '#E8650A', flexShrink: 0 }} />
                  <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.5 }}>
                    Cheques must be issued in the name of:<br />
                    <strong style={{ color: '#111827', fontSize: 12 }}>{s.account_name}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer - Thank You */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#E8650A', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              <ThumbsUp size={15} />
              <span>Thank you for your business!</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{s?.company_name ?? 'Nextiom (Pvt) Ltd'}</div>
            {notes && (
              <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.6 }}>
                {notes}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
