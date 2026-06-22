// src/pages/invoices/InvoicePrintPage.tsx
// This page is opened in a new tab via window.open('/invoices/print', '_blank')
// It reads print data from sessionStorage set by InvoiceForm

import { useEffect, useState } from 'react'
import { fmtCurrency, InvoiceCurrency, resolveLogoUrl } from '@/lib/invoices'

function formatPrintDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  const month = monthNames[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  return `${month} /  ${day} / ${year}`
}

function formatAddressLines(address?: string): string[] {
  if (!address) return ['NIWANDAMA', 'JA -ELA', 'SRI LANKA -11000']
  const normalized = address.toLowerCase().replace(/\s+/g, ' ')
  if (normalized.includes('niwandama') && normalized.includes('ja ela')) {
    return [
      'NIWANDAMA',
      'JA -ELA',
      'SRI LANKA -11000'
    ]
  }
  if (address.includes('\n')) {
    return address.split('\n').map(l => l.trim().toUpperCase()).filter(Boolean)
  }
  return address.split(/[,–-]/).map(l => l.trim().toUpperCase()).filter(Boolean)
}

function getDisplayPhone(phone?: string): string {
  const displayPhone = phone ?? '+94 70 203 2323'
  if (displayPhone.trim() === '+94 70 203 2323') {
    return '+94 70 203 2323 / +94 11 224 5666'
  }
  return displayPhone
}

function getDisplayEmail(website?: string): string {
  let displayEmail = 'info@nextiom.com'
  if (website) {
    try {
      const domain = website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
      if (domain) {
        displayEmail = `info@${domain}`
      }
    } catch {}
  }
  return displayEmail
}

export default function InvoicePrintPage() {
  const [data, setData] = useState<any>(null)
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('nxt_invoice_print')
      if (raw) {
        const parsed = JSON.parse(raw)
        setData(parsed)
        localStorage.removeItem('nxt_invoice_print')
        // Resolve the logo path / legacy URL to a signed URL the browser
        // can render. Bucket is private; raw paths from invoice_settings
        // are not directly fetchable.
        if (parsed?.settings?.logo_url) {
          resolveLogoUrl(parsed.settings.logo_url).then(setLogoUrl)
        }
      }
    } catch {}
  }, [])

  if (!data) return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center', color: '#999' }}>
      Loading invoice…
    </div>
  )

  const { invoice_no, invoice_date, due_date, client_name, client_company,
          client_phone, client_email, client_address, items = [], notes, total, status, settings: s } = data
  const currency: InvoiceCurrency = data.currency === 'USD' ? 'USD' : 'LKR'
  const paymentImage = currency === 'USD' ? '/NEXTIOM_USD.png' : '/NEXTIOM_LKR.png'
  const printInvoiceDate = formatPrintDate(invoice_date)
  const printDueDate = formatPrintDate(due_date)
  const subtotal = items.reduce((sum: number, item: any) => sum + (item.qty * item.unit_price), 0)
  const totalDiscount = items.reduce((sum: number, item: any) => sum + (item.discount || 0), 0)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #f4f4f0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { size: A4; margin: 15mm 15mm 20mm 15mm; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-body { padding: 0 !important; margin: 0 !important; min-height: auto !important; }
          .invoice-wrap {
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 28px 40px !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
            page-break-inside: avoid;
          }
          .invoice-wrap > div { margin-bottom: 12px !important; }
          .invoice-wrap table { margin-bottom: 8px !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ background: '#18181b', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ color: 'white', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
          Invoice {invoice_no} — {client_name}
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
        <div className="invoice-wrap" style={{
          maxWidth: 740,
          margin: '0 auto',
          background: 'white',
          padding: '48px 52px',
          borderRadius: 14,
          boxShadow: '0 8px 48px rgba(0,0,0,0.12)',
          fontFamily: "'DM Sans', sans-serif",
        }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, paddingBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
            {/* Left side: Company details */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {logoUrl ? (
                <img src={logoUrl} alt="logo" style={{ maxHeight: 52, maxWidth: 180, objectFit: 'contain', marginBottom: 14, alignSelf: 'flex-start' }} />
              ) : null}
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.03em', color: '#111', marginBottom: 4 }}>
                {(s?.company_name ?? 'NEXTIOM (PVT) LTD').toUpperCase()}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#111', lineHeight: 1.4, marginBottom: 12 }}>
                {formatAddressLines(s?.address).map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#111', lineHeight: 1.6 }}>
                <div><strong style={{ fontWeight: 700 }}>PHONE:</strong> {getDisplayPhone(s?.phone)}</div>
                <div><strong style={{ fontWeight: 700 }}>E-MAIL:</strong> <a href={`mailto:${getDisplayEmail(s?.website)}`} style={{ color: '#0066cc', textDecoration: 'underline' }}>{getDisplayEmail(s?.website)}</a></div>
                <div><strong style={{ fontWeight: 700 }}>WEB:</strong> <a href={s?.website ?? 'https://nextiom.com/'} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline' }}>{s?.website ?? 'https://nextiom.com/'}</a></div>
              </div>
            </div>

            {/* Right side: Invoice details */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: '#111', marginBottom: 10, lineHeight: 1 }}>
                INVOICE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 4 }}>
                <div style={{ fontSize: 12, color: '#111', lineHeight: 1.8, textAlign: 'right' }}>
                  <div><strong style={{ fontWeight: 700 }}>No:</strong> {invoice_no}</div>
                  <div><strong style={{ fontWeight: 700 }}>Date:</strong> {printInvoiceDate}</div>
                  {printDueDate && <div><strong style={{ fontWeight: 700 }}>Due:</strong> {printDueDate}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Bill to + Grand total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: 8 }}>Bill to</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 3 }}>{client_name}</div>
              {client_company && <div style={{ fontSize: 13, color: '#4b5563' }}>{client_company}</div>}
              {client_phone && <div style={{ fontSize: 13, color: '#4b5563' }}>{client_phone}</div>}
              {client_email && <div style={{ fontSize: 13, color: '#4b5563' }}>{client_email}</div>}
              {client_address && (
                <div style={{ fontSize: 13, color: '#4b5563', marginTop: 3 }}>
                  {client_address.split('\n').map((l, i) => <div key={i}>{l}</div>)}
                </div>
              )}
            </div>
            <div style={{ background: '#fff7ed', borderRadius: 12, padding: '16px 24px', textAlign: 'right', flexShrink: 0, border: '1px solid #fed7aa' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Grand total</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#E8650A', letterSpacing: '-0.02em' }}>{fmtCurrency(total, currency)}</div>
            </div>
          </div>

          {/* Items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                {['Description', 'Qty', 'Unit price', 'Discount', 'Amount'].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', padding: '8px 10px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '11px 10px', fontSize: 13 }}>
                    <div style={{ fontWeight: item.is_package ? 600 : 'normal' }}>{item.description}</div>
                    {item.is_package && item.sub_items && item.sub_items.length > 0 && (
                      <div style={{ marginTop: 4, paddingLeft: 16, fontSize: 11, color: '#4b5563', lineHeight: 1.4 }}>
                        {item.sub_items.map((sub: string, subIdx: number) => (
                          <div key={subIdx} style={{ whiteSpace: 'pre-wrap' }}>
                            {sub}
                          </div>
                        ))}
                      </div>
                    )}
                    {item.link_url && (
                      <div style={{ marginTop: 3 }}>
                        <a href={item.link_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#e8650a', textDecoration: 'underline', wordBreak: 'break-all' }}>
                          {item.link_url}
                        </a>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '11px 10px', textAlign: 'right', fontSize: 13 }}>{item.qty}</td>
                  <td style={{ padding: '11px 10px', textAlign: 'right', fontSize: 13 }}>{fmtCurrency(item.unit_price, currency)}</td>
                  <td style={{ padding: '11px 10px', textAlign: 'right', fontSize: 13 }}>{fmtCurrency(item.discount || 0, currency)}</td>
                  <td style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 600, fontSize: 13 }}>{fmtCurrency(item.qty * item.unit_price - (item.discount || 0), currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginBottom: 32 }}>
            {status === 'paid' && (
              <img
                src="/PAID STUMP.png"
                alt="PAID"
                style={{
                  position: 'absolute',
                  left: '48%',
                  top: '50%',
                  transform: 'translate(-50%, -50%) rotate(-10deg)',
                  width: 100,
                  height: 100,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                }}
              />
            )}
            <div style={{ display: 'flex', gap: 56, fontSize: 13, color: '#6b7280' }}>
              <span>Subtotal</span><span>{fmtCurrency(subtotal, currency)}</span>
            </div>
            <div style={{ display: 'flex', gap: 56, fontSize: 13, color: '#6b7280' }}>
              <span>Total Discount</span><span>{fmtCurrency(totalDiscount, currency)}</span>
            </div>
            <div style={{ display: 'flex', gap: 56, fontSize: 13, color: '#6b7280' }}>
              <span>Grand total</span><span>{fmtCurrency(total, currency)}</span>
            </div>
            <div style={{ display: 'flex', gap: 56, fontSize: 16, fontWeight: 700, borderTop: '2px solid #111', paddingTop: 8, marginTop: 4 }}>
              <span>Due total</span><span>{fmtCurrency(total, currency)}</span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18 }}>
            {s?.bank_name && (
              <div style={{ flex: '1 1 0', minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: 5 }}>Payment method</div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>Bank Transfer ({currency})</div>
                <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.9 }}>
                  <div>Name: {s.account_name}</div>
                  <div>Account number: {s.account_no}</div>
                  <div>Bank: {s.bank_name} </div>
                  <div> Branch: Gampaha</div>
                  <div> Swift Code : CCEYLKLX </div>
                </div>
                {s.account_name && (
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                    Cheques must be issued in the name of: <strong style={{ color: '#6b7280' }}>{s.account_name}</strong>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#111', textAlign: 'center' }}>
                Scan and Pay with {currency === 'USD' ? 'PayPal' : 'LankaQR'}
              </div>
              <img
                src={paymentImage}
                alt={`${currency} payment details`}
                style={{ display: 'block', width: 140, height: 'auto', objectFit: 'contain' }}
              />
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, width: 220 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#E8650A' }}>Thank you for your business!</div>
              {s?.company_name && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{s.company_name}</div>}
              <img
                src="/signature.png"
                alt="Signature"
                style={{ display: 'block', width: 200, height: 'auto', margin: '8px 0 0 auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {notes && (
            <div style={{ marginTop: 16, fontSize: 11, color: '#9ca3af', lineHeight: 1.7, borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
              {notes}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
