import InvoiceForm from '@/components/invoices/InvoiceForm'

interface Props {
  c: any
  isDark: boolean
  onBack: () => void
}

export default function NewInvoicePage({ c, isDark, onBack }: Props) {
  return <InvoiceForm c={c} isDark={isDark} onBack={onBack} />
}
