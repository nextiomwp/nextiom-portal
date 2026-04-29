import { useEffect, useState } from 'react'
import InvoiceForm from '@/components/invoices/InvoiceForm'
import { Invoice, getInvoice } from '@/lib/invoices'

interface Props {
  c: any
  isDark: boolean
  invoiceId: string
  onBack: () => void
}

export default function EditInvoicePage({ c, isDark, invoiceId, onBack }: Props) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInvoice(invoiceId)
      .then(inv => setInvoice(inv))
      .finally(() => setLoading(false))
  }, [invoiceId])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#a0a0a0', fontSize: 14 }}>
      Loading invoice…
    </div>
  )

  return invoice
    ? <InvoiceForm c={c} isDark={isDark} existing={invoice} onBack={onBack} />
    : <div style={{ textAlign: 'center', padding: 40, color: '#a0a0a0' }}>Invoice not found.</div>
}
