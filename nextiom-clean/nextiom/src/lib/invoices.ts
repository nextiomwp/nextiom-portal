// src/lib/invoices.ts
//All Supabase queries for the invoice module

import { supabase, supabaseUrl as SUPABASE_URL, supabaseAnonKey as SUPABASE_ANON_KEY } from './customSupabaseClient'
import { assertPortalActionsAllowed } from './storage'

// ── Types ────────────────────────────────────────────────────

export interface InvoiceItem {
  id?: string
  invoice_id?: string
  description: string
  qty: number
  unit_price: number
  discount?: number
  link_url?: string
  amount?: number
  sort_order?: number
  is_package?: boolean
  sub_items?: string[]
  refunded?: boolean
}

export type InvoiceStatus = 'unpaid' | 'paid' | 'overdue' | 'payment_submitted' | 'partially_paid' | 'refunded' | 'partially_refunded'
export type InvoiceCurrency = 'LKR' | 'USD'

export interface Invoice {
  id?: string
  user_id?: string
  invoice_no: string
  invoice_date: string
  due_date: string | null
  status: InvoiceStatus
  client_name: string
  client_company: string
  client_phone: string
  client_email: string
  client_address: string
  notes: string
  total: number
  paid_amount?: number
  refunded_amount?: number
  refund_date?: string
  refund_reason?: string
  refund_service_charge?: number
  currency?: InvoiceCurrency
  created_at?: string
  items?: InvoiceItem[]
  service_name?: string
  deleted_at?: string
}

export interface InvoiceSettings {
  id?: string
  user_id?: string
  company_name: string
  reg_no: string
  phone: string
  website: string
  address: string
  bank_name: string
  bank_branch: string
  account_name: string
  account_no: string
  default_notes: string
  logo_url: string
  recycle_bin_retention_hours?: number
}

// ── Helpers ──────────────────────────────────────────────────

export function calcSubtotal(items: InvoiceItem[]): number {
  return items.reduce((s, i) => s + i.qty * i.unit_price, 0)
}

export function calcTotalDiscount(items: InvoiceItem[]): number {
  return items.reduce((s, i) => s + (i.discount || 0), 0)
}

export function calcTotal(items: InvoiceItem[]): number {
  return items.reduce((s, i) => s + (i.qty * i.unit_price - (i.discount || 0)), 0)
}

export function fmtLKR(amount: number): string {
  return 'LKR ' + amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtCurrency(amount: number, currency: InvoiceCurrency = 'LKR'): string {
  if (currency === 'USD') {
    return 'USD ' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return fmtLKR(amount)
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function dueDateISO(days = 7): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export async function generateInvoiceNo(): Promise<string> {
  const now = new Date()
  const yr = String(now.getFullYear()).slice(2)
  const mo = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `${yr}${mo}-`

  const { data } = await supabase
    .from('invoices')
    .select('invoice_no')
    .ilike('invoice_no', `${prefix}%`)
    .is('deleted_at', null)
    .order('invoice_no', { ascending: false })
    .limit(1)

  const last = data?.[0]?.invoice_no
  const lastNum = last ? parseInt(last.replace(prefix, '')) || 0 : 0
  return `${prefix}${String(lastNum + 1).padStart(4, '0')}`
}

export function defaultSettings(): InvoiceSettings {
  return {
    company_name: 'Nextiom (Pvt) Ltd',
    reg_no: 'PV 00263572',
    phone: '+94 70 203 2323',
    website: 'https://nextiom.com/',
    address: 'Niwandama, Ja Ela – 11350',
    bank_name: 'Commercial Bank',
    bank_branch: 'Gampaha (44)',
    account_name: 'Nextiom Pvt Ltd',
    account_no: '1000564301',
    default_notes: 'Please settle the due amount within 7 days of purchase to avoid pricing adjustments caused by exchange rate fluctuations. A 50% advance payment is required before starting the project.',
    logo_url: '',
    recycle_bin_retention_hours: 24,
  }
}

// ── Settings ─────────────────────────────────────────────────

// NOTE: invoice_settings.logo_url stores a STORAGE PATH (or, for legacy data
// uploaded before the bucket went private, a full public URL). It is NOT a
// directly-renderable URL. UI components must call resolveLogoUrl() before
// using it as an <img src>. Readers below intentionally do not resolve, so
// that a subsequent saveInvoiceSettings() doesn't persist an expiring URL.

export async function getPublicInvoiceSettings(): Promise<InvoiceSettings> {
  const { data } = await supabase
    .from('invoice_settings')
    .select('*')
    .limit(1)
    .single()
  return data ?? defaultSettings()
}

export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return defaultSettings()

  const { data } = await supabase
    .from('invoice_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return data ?? defaultSettings()
}

export async function saveInvoiceSettings(settings: Partial<InvoiceSettings>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('invoice_settings')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    await supabase.from('invoice_settings').update(settings).eq('user_id', user.id)
  } else {
    await supabase.from('invoice_settings').insert({ ...settings, user_id: user.id })
  }
}

export async function uploadLogo(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const ext = file.name.split('.').pop()
  const path = `logos/${user.id}/logo.${ext}`

  const { error } = await supabase.storage
    .from('invoice-assets')
    .upload(path, file, { upsert: true })

  if (error) throw error

  // Return the storage PATH (not a renderable URL). Callers store this in
  // invoice_settings.logo_url and call resolveLogoUrl() when rendering.
  return path
}

// Resolve a stored logo_url value (storage path, legacy public URL, or
// external http URL) into a renderable URL. Signs storage paths; leaves
// external URLs untouched. Returns empty string on missing/empty input.
export async function resolveLogoUrl(value: string | null | undefined, expiresInSec = 3600): Promise<string> {
  if (!value) return ''
  // Data URL (transient local preview) — render directly.
  if (value.startsWith('data:')) return value
  // Legacy: full Supabase public URL stored before the bucket went private.
  // Extract the storage path so we can sign it.
  const m = value.match(/\/storage\/v1\/object\/public\/invoice-assets\/(.+)$/)
  if (m) {
    try {
      const { data, error } = await supabase.storage
        .from('invoice-assets')
        .createSignedUrl(m[1], expiresInSec)
      if (!error && data?.signedUrl) return data.signedUrl
    } catch { /* fall through */ }
    return value
  }
  // Any other http(s) URL: leave alone (could be external CDN).
  if (/^https?:\/\//i.test(value)) return value
  // Otherwise treat as a storage path.
  try {
    const { data, error } = await supabase.storage
      .from('invoice-assets')
      .createSignedUrl(value, expiresInSec)
    if (!error && data?.signedUrl) return data.signedUrl
  } catch { /* fall through */ }
  return value
}

// ── Invoices ─────────────────────────────────────────────────

export async function getInvoices(includeDeleted = false): Promise<Invoice[]> {
  let query = supabase
    .from('invoices')
    .select('*')

  if (!includeDeleted) {
    query = query.is('deleted_at', null)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

function deserializeItem(item: any): InvoiceItem {
  try {
    if (item.description && item.description.startsWith('{')) {
      const parsed = JSON.parse(item.description)
      if (parsed && parsed.is_package) {
        return {
          ...item,
          description: parsed.name || '',
          is_package: true,
          sub_items: parsed.sub_items || []
        }
      }
    }
  } catch (e) {
    // Ignore JSON parse errors
  }
  return {
    ...item,
    is_package: false,
    sub_items: []
  }
}

function serializeItem(item: InvoiceItem): any {
  let desc = item.description
  if (item.is_package) {
    desc = JSON.stringify({
      is_package: true,
      name: item.description,
      sub_items: item.sub_items || []
    })
  }
  return {
    description: desc,
    qty: item.qty,
    unit_price: item.unit_price,
    discount: item.discount || 0,
    link_url: item.link_url || null,
  }
}

export async function getCustomerInvoices(email: string): Promise<Invoice[]> {
  if (!email) return []
  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('client_email', email)
    .is('deleted_at', null)
    .order('invoice_date', { ascending: false })

  if (error) throw error
  return (data ?? []).map((inv: any) => ({ ...inv, items: (inv.invoice_items ?? []).map(deserializeItem) }))
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !invoice) return null

  const { data: items } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order')

  return { ...invoice, items: (items ?? []).map(deserializeItem) }
}

export async function createInvoice(invoice: Invoice, items: InvoiceItem[]): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const total = calcTotal(items)

  const { data, error } = await supabase
    .from('invoices')
    .insert({ ...invoice, user_id: user.id, total })
    .select('id')
    .single()

  if (error || !data) throw error ?? new Error('Failed to create invoice')

  if (items.length) {
    await supabase.from('invoice_items').insert(
      items.map((item, i) => ({
        ...serializeItem(item),
        invoice_id: data.id,
        sort_order: i,
      }))
    )
  }

  return data.id
}

export async function updateInvoice(id: string, invoice: Partial<Invoice>, items: InvoiceItem[]): Promise<void> {
  const total = calcTotal(items)

  const { error } = await supabase
    .from('invoices')
    .update({ ...invoice, total })
    .eq('id', id)

  if (error) throw error

  // Replace all items
  await supabase.from('invoice_items').delete().eq('invoice_id', id)
  if (items.length) {
    const { error: itemsError } = await supabase.from('invoice_items').insert(
      items.map((item, i) => ({
        ...serializeItem(item),
        invoice_id: id,
        sort_order: i,
      }))
    )
    if (itemsError) throw itemsError
  }
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function restoreInvoice(id: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .update({ deleted_at: null })
    .eq('id', id)
  if (error) throw error
}

export async function permanentlyDeleteInvoice(id: string): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
  await supabase.from('invoices').update({ status }).eq('id', id)
}

export async function refundInvoice(
  id: string,
  amount: number,
  reason?: string,
  serviceCharge = 0,
  refundedItemIds?: string[]
): Promise<void> {
  const invoice = await getInvoice(id)
  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status !== 'paid' && invoice.status !== 'partially_paid' && invoice.status !== 'partially_refunded' && invoice.status !== 'refunded') {
    throw new Error('Only paid, partially paid, or refunded/partially refunded invoices can be refunded')
  }

  const currentRefunded = Number(invoice.refunded_amount || 0)
  const total = Number(invoice.total || 0)
  const paidAmt = Number(invoice.paid_amount || total)
  const newRefunded = currentRefunded + amount

  if (newRefunded > paidAmt) {
    throw new Error(`Refund amount exceeds the paid amount of ${paidAmt}`)
  }

  const isFullRefund = Math.abs(newRefunded - paidAmt) < 0.01
  const newStatus: InvoiceStatus = isFullRefund ? 'refunded' : 'partially_refunded'

  const { error } = await supabase
    .from('invoices')
    .update({
      status: newStatus,
      refunded_amount: newRefunded,
      refund_date: new Date().toISOString(),
      refund_reason: reason || null,
      refund_service_charge: Number(serviceCharge || 0)
    })
    .eq('id', id)

  if (error) throw error

  // Update individual invoice items refunded status
  if (refundedItemIds && refundedItemIds.length > 0) {
    const { data: items } = await supabase
      .from('invoice_items')
      .select('id')
      .eq('invoice_id', id)

    if (items) {
      for (const item of items) {
        const isRefunded = refundedItemIds.includes(item.id)
        await supabase
          .from('invoice_items')
          .update({ refunded: isRefunded })
          .eq('id', item.id)
      }
    }
  }

  const cur = invoice.currency || 'LKR'
  await notifyCustomerByEmail(invoice.client_email, {
    type: isFullRefund ? 'invoice_refunded' : 'invoice_partially_refunded',
    title: isFullRefund ? `Invoice Refunded: ${invoice.invoice_no}` : `Invoice Partially Refunded: ${invoice.invoice_no}`,
    message: isFullRefund
      ? `Your payment of ${fmtCurrency(paidAmt, cur)} for invoice ${invoice.invoice_no} has been fully refunded.`
      : `An amount of ${fmtCurrency(amount, cur)} has been refunded from your invoice ${invoice.invoice_no}. Total refunded: ${fmtCurrency(newRefunded, cur)}.`,
  })
}

// ── Payments ─────────────────────────────────────────────────

export interface InvoicePayment {
  id?: string
  invoice_id: string
  customer_email?: string
  transaction_id: string
  bank_account_name?: string
  paid_amount: number
  payment_date: string
  notes?: string
  slip_url?: string
  /** Raw Supabase storage path, preserved before slip_url is resolved to a signed URL. Use this for on-demand admin downloads. */
  slip_path?: string
  status?: 'submitted' | 'approved' | 'rejected' | 'info_requested'
  admin_reason?: string
  created_at?: string
  updated_at?: string
}

export async function uploadPaymentSlip(invoiceId: string, file: File): Promise<string> {
  // Path must start with payment-slips/{auth.uid()}/... so the storage RLS
  // policy "payment-slips: customer upload own" passes. The bucket is no
  // longer public, so we sign a URL for read access instead of getPublicUrl.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `payment-slips/${user.id}/${invoiceId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('invoice-assets').upload(path, file, { upsert: false })
  if (error) throw error
  // Store the storage path; consumers call createSignedUrl to view.
  return path
}

export async function getPaymentSlipSignedUrl(rawPath: string, expiresInSec = 3600): Promise<string> {
  // Normalise the stored value to a plain storage path.
  // Legacy rows may contain a full URL (Supabase public/signed URL, or a
  // local-dev-server URL like http://10.x.x.x:3000/payment-slips/...).
  // We extract the meaningful path segment in all cases rather than returning
  // those stale URLs directly — they are either expired or unreachable.
  let path = rawPath

  if (/^https?:\/\//i.test(rawPath)) {
    try {
      const url = new URL(rawPath)
      const supabaseHost = new URL(SUPABASE_URL).hostname

      if (url.hostname === supabaseHost) {
        // Genuine Supabase storage URL — strip known prefixes to get the path.
        // Handles both /object/public/<bucket>/<path> and /object/sign/<bucket>/<path>
        const m = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+)$/)
        if (m) {
          path = m[1]
        } else {
          // Cannot parse — return as-is (may still work for public assets).
          return rawPath
        }
      } else {
        // Non-Supabase URL (localhost, LAN IP, external CDN, etc.).
        // Try to extract a storage path from the URL pathname.
        // Pattern: anything after /payment-slips/ or /logos/ etc.
        const m = url.pathname.match(/\/((?:payment-slips|logos)\/.+)$/)
        if (m) {
          path = m[1]
        } else {
          // Cannot map to a known storage path; return original and hope for the best.
          return rawPath
        }
      }
    } catch {
      // Malformed URL — treat the raw value as a plain path.
      path = rawPath
    }
  }

  const { data } = supabase.storage.from('invoice-assets').getPublicUrl(path)
  return data.publicUrl || ''
}

async function notifyCustomerByEmail(email: string, notif: { type: string; title: string; message: string }): Promise<void> {
  if (!email) return
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (!customer) return
  await supabase.from('notifications').insert({
    customer_id: customer.id,
    type: notif.type,
    title: notif.title,
    message: notif.message,
  })
}

export async function submitInvoicePayment(
  invoice: Invoice,
  payment: { bank_account_name?: string; transaction_id: string; paid_amount: number; payment_date: string; notes?: string },
  file: File | null
): Promise<void> {
  await assertPortalActionsAllowed()
  let slip_url = ''
  if (file) slip_url = await uploadPaymentSlip(invoice.id!, file)

  const { error } = await supabase.from('invoice_payments').insert({
    invoice_id: invoice.id!,
    customer_email: invoice.client_email,
    transaction_id: payment.transaction_id,
    bank_account_name: payment.bank_account_name ?? null,
    paid_amount: payment.paid_amount,
    payment_date: payment.payment_date,
    notes: payment.notes ?? null,
    slip_url,
    status: 'submitted',
  })
  if (error) throw error

  // invoices.status flip is handled server-side by the
  // trg_payment_flip_invoice trigger (see security_hardening_migration.sql).
  // Customers no longer have UPDATE permission on the invoices table.

  await supabase.from('notifications').insert({
    customer_id: null,
    type: 'payment_submitted',
    title: `Payment Submitted: ${invoice.invoice_no}`,
    message: `${invoice.client_name} submitted ${fmtCurrency(payment.paid_amount, invoice.currency)} for invoice ${invoice.invoice_no} (Ref: ${payment.transaction_id}).`,
  })
}

export async function getInvoicePayments(invoiceId: string): Promise<InvoicePayment[]> {
  const { data, error } = await supabase
    .from('invoice_payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = data ?? []
  // slip_url stores a storage path (post-hardening) or a legacy public URL.
  // Resolve to a signed URL the UI can render directly.
  await Promise.all(rows.map(async (r: InvoicePayment) => {
    if (r.slip_url) {
      // Preserve the raw storage path so the admin can call the edge function
      // on-demand (e.g. for the "Download slip" button) even if URL resolution
      // below fails.
      r.slip_path = r.slip_url
      try { r.slip_url = await getPaymentSlipSignedUrl(r.slip_url) } catch { /* leave as-is */ }
    }
  }))
  return rows
}

export async function getLatestPaymentByInvoice(invoiceId: string): Promise<InvoicePayment | null> {
  const list = await getInvoicePayments(invoiceId)
  return list[0] ?? null
}

export async function approveInvoicePayment(payment: InvoicePayment, invoice: Invoice): Promise<void> {
  const { error: pErr } = await supabase
    .from('invoice_payments')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', payment.id)
  if (pErr) throw pErr

  const { data: approvedPayments, error: fetchErr } = await supabase
    .from('invoice_payments')
    .select('paid_amount')
    .eq('invoice_id', invoice.id)
    .eq('status', 'approved')
  if (fetchErr) throw fetchErr

  const totalPaid = (approvedPayments ?? []).reduce((sum, p) => sum + Number(p.paid_amount || 0), 0)
  const isFullyPaid = totalPaid >= (invoice.total || 0) - 0.01
  const newStatus: InvoiceStatus = isFullyPaid ? 'paid' : 'partially_paid'

  const { error: invErr } = await supabase
    .from('invoices')
    .update({ status: newStatus, paid_amount: totalPaid })
    .eq('id', invoice.id)
  if (invErr) throw invErr

  const cur = invoice.currency || 'LKR'
  await notifyCustomerByEmail(invoice.client_email, {
    type: 'payment_approved',
    title: isFullyPaid ? `Payment Approved: ${invoice.invoice_no}` : `Payment Approved (Installment): ${invoice.invoice_no}`,
    message: isFullyPaid
      ? `Your payment for invoice ${invoice.invoice_no} has been approved. Thank you! Your invoice is now fully paid.`
      : `Your installment payment of ${fmtCurrency(payment.paid_amount, cur)} for invoice ${invoice.invoice_no} has been approved. Total paid: ${fmtCurrency(totalPaid, cur)} of ${fmtCurrency(invoice.total, cur)}.`,
  })
}

export async function rejectInvoicePayment(payment: InvoicePayment, invoice: Invoice, reason: string): Promise<void> {
  const { error: pErr } = await supabase
    .from('invoice_payments')
    .update({ status: 'rejected', admin_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', payment.id)
  if (pErr) throw pErr

  const { data: approvedPayments, error: fetchErr } = await supabase
    .from('invoice_payments')
    .select('paid_amount')
    .eq('invoice_id', invoice.id)
    .eq('status', 'approved')
  if (fetchErr) throw fetchErr

  const totalPaid = (approvedPayments ?? []).reduce((sum, p) => sum + Number(p.paid_amount || 0), 0)
  const newStatus: InvoiceStatus = totalPaid > 0 ? 'partially_paid' : 'unpaid'

  const { error: invErr } = await supabase
    .from('invoices')
    .update({ status: newStatus, paid_amount: totalPaid })
    .eq('id', invoice.id)
  if (invErr) throw invErr

  await notifyCustomerByEmail(invoice.client_email, {
    type: 'payment_rejected',
    title: `Payment Rejected: ${invoice.invoice_no}`,
    message: `Your payment for invoice ${invoice.invoice_no} was rejected. Reason: ${reason}`,
  })
}

export async function resubmitPaymentInfo(
  payment: InvoicePayment,
  invoice: Invoice,
  reply: string,
  file: File | null
): Promise<void> {
  await assertPortalActionsAllowed()
  // Only overwrite slip_url if a new file was uploaded — otherwise leave the
  // existing storage path in the DB. (payment.slip_url here is a signed URL
  // resolved by getInvoicePayments; writing it back would persist an
  // expiring URL.)
  const newNotes = [payment.notes, `Customer reply: ${reply}`].filter(Boolean).join('\n\n')
  const update: Record<string, unknown> = {
    status: 'submitted',
    notes: newNotes,
    admin_reason: null,
    updated_at: new Date().toISOString(),
  }
  if (file) update.slip_url = await uploadPaymentSlip(invoice.id!, file)
  await supabase.from('invoice_payments').update(update).eq('id', payment.id)
  await supabase.from('notifications').insert({
    customer_id: null,
    type: 'payment_submitted',
    title: `Payment Info Updated: ${invoice.invoice_no}`,
    message: `${invoice.client_name} replied to your info request on invoice ${invoice.invoice_no}.`,
  })
}

export async function requestPaymentInfo(payment: InvoicePayment, invoice: Invoice, message: string): Promise<void> {
  await supabase.from('invoice_payments').update({ status: 'info_requested', admin_reason: message, updated_at: new Date().toISOString() }).eq('id', payment.id)
  await notifyCustomerByEmail(invoice.client_email, {
    type: 'payment_info_requested',
    title: `Info Requested: ${invoice.invoice_no}`,
    message: `Additional information needed for your payment on ${invoice.invoice_no}: ${message}`,
  })
}
