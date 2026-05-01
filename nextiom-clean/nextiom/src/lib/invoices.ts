// src/lib/invoices.ts
//All Supabase queries for the invoice module

import { supabase } from './customSupabaseClient'

// ── Types ────────────────────────────────────────────────────

export interface InvoiceItem {
  id?: string
  invoice_id?: string
  description: string
  qty: number
  unit_price: number
  amount?: number
  sort_order?: number
}

export type InvoiceStatus = 'unpaid' | 'paid' | 'overdue'

export interface Invoice {
  id?: string
  user_id?: string
  invoice_no: string
  invoice_date: string
  due_date: string
  status: InvoiceStatus
  client_name: string
  client_company: string
  client_phone: string
  client_email: string
  client_address: string
  notes: string
  total: number
  created_at?: string
  items?: InvoiceItem[]
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
}

// ── Helpers ──────────────────────────────────────────────────

export function calcTotal(items: InvoiceItem[]): number {
  return items.reduce((s, i) => s + i.qty * i.unit_price, 0)
}

export function fmtLKR(amount: number): string {
  return 'LKR ' + amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
  }
}

// ── Settings ─────────────────────────────────────────────────

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

  const { data } = supabase.storage.from('invoice-assets').getPublicUrl(path)
  return data.publicUrl
}

// ── Invoices ─────────────────────────────────────────────────

export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getCustomerInvoices(email: string): Promise<Invoice[]> {
  if (!email) return []
  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('client_email', email)
    .order('invoice_date', { ascending: false })

  if (error) throw error
  return (data ?? []).map((inv: any) => ({ ...inv, items: inv.invoice_items ?? [] }))
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

  return { ...invoice, items: items ?? [] }
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
        description: item.description,
        qty: item.qty,
        unit_price: item.unit_price,
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
        description: item.description,
        qty: item.qty,
        unit_price: item.unit_price,
        invoice_id: id,
        sort_order: i,
      }))
    )
    if (itemsError) throw itemsError
  }
}

export async function deleteInvoice(id: string): Promise<void> {
  await supabase.from('invoices').delete().eq('id', id)
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
  await supabase.from('invoices').update({ status }).eq('id', id)
}
