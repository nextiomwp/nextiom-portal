// src/pages/invoices/InvoicePrintPage.tsx
// This page is opened in a new tab via window.open('/invoices/print', '_blank')
// It reads print data from sessionStorage set by InvoiceForm

import { useEffect, useState } from 'react'
import { fmtCurrency, InvoiceCurrency, resolveLogoUrl } from '@/lib/invoices'

function formatPrintDate(value?: string) {
  if (!value) return ''
  return value.split('T')[0]
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
          client_phone, client_email, client_address, items, notes, total, settings: s } = data
  const currency: InvoiceCurrency = data.currency === 'USD' ? 'USD' : 'LKR'
  const paymentImage = currency === 'USD' ? '/NEXTIOM_USD.png' : '/NEXTIOM_LKR.png'
  const printInvoiceDate = formatPrintDate(invoice_date)
  const printDueDate = formatPrintDate(due_date)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #f4f4f0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .invoice-wrap { box-shadow: none !important; border-radius: 0 !important; }
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
      <div style={{ padding: '36px 20px', minHeight: '100vh' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, paddingBottom: 24, borderBottom: '3px solid #E8650A' }}>
            <div>
              {logoUrl
                ? <img src={logoUrl} alt="logo" style={{ maxHeight: 52, maxWidth: 180, objectFit: 'contain', marginBottom: 10 }} />
                : <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>{s?.company_name ?? 'Nextiom (Pvt) Ltd'}</div>
              }
              <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.8 }}>
                {s?.address && <div>{s.address}</div>}
                {s?.phone && <div>{s.phone}{s?.website ? ` · ${s.website}` : ''}</div>}
                {s?.reg_no && <div>{s.reg_no}</div>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', color: '#111' }}>INVOICE</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 10, lineHeight: 2 }}>
                <div><strong style={{ color: '#111' }}>No.</strong> {invoice_no}</div>
                <div><strong style={{ color: '#111' }}>Date:</strong> {printInvoiceDate}</div>
                {printDueDate && <div><strong style={{ color: '#111' }}>Due:</strong> {printDueDate}</div>}
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
                {['Description', 'Qty', 'Unit price', 'Amount'].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', padding: '8px 10px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '11px 10px', fontSize: 13 }}>{item.description}</td>
                  <td style={{ padding: '11px 10px', textAlign: 'right', fontSize: 13 }}>{item.qty}</td>
                  <td style={{ padding: '11px 10px', textAlign: 'right', fontSize: 13 }}>{fmtCurrency(item.unit_price, currency)}</td>
                  <td style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 600, fontSize: 13 }}>{fmtCurrency(item.qty * item.unit_price, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 56, fontSize: 13, color: '#6b7280' }}>
              <span>INV total cost</span><span>{fmtCurrency(total, currency)}</span>
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
                  <div>Bank: {s.bank_name} · Branch: {s.bank_branch}</div>
                </div>
                {s.account_name && (
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                    Cheques must be issued in the name of: <strong style={{ color: '#6b7280' }}>{s.account_name}</strong>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', textAlign: 'center' }}>
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
