// src/lib/quotations.ts
// All Supabase queries for the quotation module

import { supabase } from './customSupabaseClient'

// ── Types ────────────────────────────────────────────────────

export interface QuotationItem {
  id?: string
  quotation_id?: string
  description: string
  qty: number
  unit_price: number
  amount?: number
  sort_order?: number
}

export type QuotationCurrency = 'LKR' | 'USD'

export interface Quotation {
  id?: string
  user_id?: string
  customer_id?: string
  quotation_no: string
  quotation_date: string
  valid_until: string
  client_name: string
  client_company: string
  client_phone: string
  client_email: string
  client_address: string
  notes: string
  total: number
  currency?: QuotationCurrency
  project_timeline?: string
  status?: string
  created_at?: string
  items?: QuotationItem[]
}

// ── Helpers ──────────────────────────────────────────────────

export function calcTotal(items: QuotationItem[]): number {
  return items.reduce((s, i) => s + i.qty * i.unit_price, 0)
}

export function fmtLKR(amount: number): string {
  return 'LKR ' + amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtCurrency(amount: number, currency: QuotationCurrency = 'LKR'): string {
  if (currency === 'USD') {
    return 'USD ' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return fmtLKR(amount)
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function validityISO(days = 30): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export async function generateQuotationNo(): Promise<string> {
  const now = new Date()
  const yr = String(now.getFullYear()).slice(2)
  const mo = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `QT-${yr}${mo}-`

  const { data } = await supabase
    .from('quotations')
    .select('quotation_no')
    .ilike('quotation_no', `${prefix}%`)
    .order('quotation_no', { ascending: false })
    .limit(1)

  const last = data?.[0]?.quotation_no
  const lastNum = last ? parseInt(last.replace(prefix, '')) || 0 : 0
  return `${prefix}${String(lastNum + 1).padStart(3, '0')}`
}

// ── Quotations ─────────────────────────────────────────────────

export async function getQuotations(): Promise<Quotation[]> {
  const { data, error } = await supabase
    .from('quotations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getQuotation(id: string): Promise<Quotation | null> {
  const { data: quotation, error } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !quotation) return null

  const { data: items } = await supabase
    .from('quotation_items')
    .select('*')
    .eq('quotation_id', id)
    .order('sort_order')

  return { ...quotation, items: items ?? [] }
}

export async function createQuotation(quotation: Quotation, items: QuotationItem[]): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const total = calcTotal(items)

  const { data, error } = await supabase
    .from('quotations')
    .insert({ ...quotation, user_id: user.id, total })
    .select('id')
    .single()

  if (error || !data) throw error ?? new Error('Failed to create quotation')

  if (items.length) {
    await supabase.from('quotation_items').insert(
      items.map((item, i) => ({
        description: item.description,
        qty: item.qty,
        unit_price: item.unit_price,
        quotation_id: data.id,
        sort_order: i,
      }))
    )
  }

  return data.id
}

export async function updateQuotation(id: string, quotation: Partial<Quotation>, items: QuotationItem[]): Promise<void> {
  const total = calcTotal(items)

  const { error } = await supabase
    .from('quotations')
    .update({ ...quotation, total })
    .eq('id', id)

  if (error) throw error

  // Replace all items
  await supabase.from('quotation_items').delete().eq('quotation_id', id)
  if (items.length) {
    const { error: itemsError } = await supabase.from('quotation_items').insert(
      items.map((item, i) => ({
        description: item.description,
        qty: item.qty,
        unit_price: item.unit_price,
        quotation_id: id,
        sort_order: i,
      }))
    )
    if (itemsError) throw itemsError
  }
}

export async function deleteQuotation(id: string): Promise<void> {
  const { error } = await supabase
    .from('quotations')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getCustomerQuotations(email: string): Promise<Quotation[]> {
  if (!email) return []
  const { data, error } = await supabase
    .from('quotations')
    .select('*, quotation_items(*)')
    .eq('client_email', email)
    .order('quotation_date', { ascending: false })

  if (error) throw error
  return (data ?? []).map((q: any) => ({ ...q, items: q.quotation_items ?? [] }))
}

export async function updateQuotationStatus(id: string, status: string, initiator: 'admin' | 'customer' = 'admin'): Promise<void> {
  // 1. Fetch quotation details
  const { data: q } = await supabase
    .from('quotations')
    .select('quotation_no, customer_id, client_email, client_name')
    .eq('id', id)
    .maybeSingle()

  // 2. Update status in DB
  const { error } = await supabase
    .from('quotations')
    .update({ status })
    .eq('id', id)

  if (error) {
    // If the update returned an error, verify if the status was actually updated.
    // This bypasses false-positive errors returned by PostgREST due to RLS select policies.
    const { data: checkQ } = await supabase
      .from('quotations')
      .select('status')
      .eq('id', id)
      .maybeSingle()

    if (!checkQ || checkQ.status !== status) {
      throw error
    }
  }

  // 3. Send notifications
  if (q) {
    if (initiator === 'admin') {
      let customerId = q.customer_id
      if (!customerId && q.client_email) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', q.client_email)
          .maybeSingle()
        if (customer) {
          customerId = customer.id
        }
      }

      if (customerId) {
        supabase.from('notifications').insert({
          customer_id: customerId,
          type: 'quotation',
          title: `Quotation Status Updated — ${q.quotation_no}`,
          message: `Your quotation ${q.quotation_no} status has been updated to "${status.charAt(0).toUpperCase() + status.slice(1)}" by the Admin.`,
        }).then(({ error: nErr }) => {
          if (nErr) console.error('Notification error:', nErr)
        })
      }
    } else {
      // Initiator is customer
      supabase.from('notifications').insert({
        customer_id: null,
        type: 'quotation',
        title: `Quotation ${status.charAt(0).toUpperCase() + status.slice(1)} — ${q.quotation_no}`,
        message: `Customer ${q.client_name} (${q.client_email || ''}) has ${status} the quotation ${q.quotation_no}.`,
      }).then(({ error: nErr }) => {
        if (nErr) console.error('Notification error:', nErr)
      })
    }
  }
}


