import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encodeBase64 } from "https://deno.land/std@0.203.0/encoding/base64.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Helper to compute HMAC-SHA256 signature in Base64
async function calculateHmac(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    messageData
  );

  return encodeBase64(signature);
}

serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse payload
    const body = await req.json()
    const {
      transactionReference,
      orderId,
      transactionAmount,
      creditedAmount,
      transactionStatus,
      transactionMessage,
      transactionTimeInMillis,
      merchantParam1,
      merchantParam2,
      checksum,
    } = body

    if (!orderId || !transactionStatus || !checksum) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    // 1. Get the secret key from payment_settings
    const { data: paySettings, error: settingsError } = await supabase
      .from('payment_settings')
      .select('ipay_secret')
      .eq('id', 1)
      .maybeSingle()

    if (settingsError || !paySettings?.ipay_secret) {
      console.error('Failed to retrieve iPay secret:', settingsError)
      return new Response(JSON.stringify({ error: 'iPay gateway not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const secret = paySettings.ipay_secret

    // 2. Verify checksum
    // message = transactionReference + orderId + transactionTimeInMillis + transactionAmount + transactionStatus
    const message = `${transactionReference || ''}${orderId || ''}${transactionTimeInMillis || ''}${transactionAmount || ''}${transactionStatus || ''}`
    const expectedChecksum = await calculateHmac(message, secret)

    if (expectedChecksum !== checksum) {
      console.error(`Invalid checksum: expected ${expectedChecksum}, received ${checksum}`)
      return new Response(JSON.stringify({ error: 'Invalid checksum' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 3. Find the payment record
    const { data: payment, error: fetchPaymentError } = await supabase
      .from('invoice_payments')
      .select('*, invoices(*)')
      .eq('id', orderId)
      .maybeSingle()

    if (fetchPaymentError || !payment) {
      console.error(`Payment record not found for ID: ${orderId}`, fetchPaymentError)
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const invoice = payment.invoices
    if (!invoice) {
      console.error(`Invoice record not found for payment ID: ${orderId}`)
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Map status: A = approved, D = rejected, P = pending/submitted
    let targetPaymentStatus = 'submitted'
    if (transactionStatus === 'A') {
      targetPaymentStatus = 'approved'
    } else if (transactionStatus === 'D') {
      targetPaymentStatus = 'rejected'
    }

    // 4. Update the invoice_payments record
    const { error: updatePaymentError } = await supabase
      .from('invoice_payments')
      .update({
        transaction_id: transactionReference,
        status: targetPaymentStatus,
        notes: `${payment.notes || ''}\niPay Response: ${transactionMessage || ''}`.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updatePaymentError) {
      console.error('Failed to update payment record:', updatePaymentError)
      return new Response(JSON.stringify({ error: 'Failed to update payment' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 5. If approved, recalculate and update invoice status
    if (targetPaymentStatus === 'approved') {
      const { data: approvedPayments, error: fetchApprovedError } = await supabase
        .from('invoice_payments')
        .select('paid_amount')
        .eq('invoice_id', invoice.id)
        .eq('status', 'approved')

      if (fetchApprovedError) {
        console.error('Failed to fetch approved payments:', fetchApprovedError)
      } else {
        const totalPaid = (approvedPayments ?? []).reduce((sum, p) => sum + Number(p.paid_amount || 0), 0)
        const isFullyPaid = totalPaid >= (invoice.total || 0) - 0.01
        const newInvoiceStatus = isFullyPaid ? 'paid' : 'partially_paid'

        const { error: updateInvoiceError } = await supabase
          .from('invoices')
          .update({
            status: newInvoiceStatus,
            paid_amount: totalPaid,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoice.id)

        if (updateInvoiceError) {
          console.error('Failed to update invoice status:', updateInvoiceError)
        }

        // Notify customer
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', invoice.client_email)
          .maybeSingle()

        if (customer) {
          const formattedAmount = `${invoice.currency || 'LKR'} ${Number(payment.paid_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          await supabase.from('notifications').insert({
            customer_id: customer.id,
            type: 'payment_approved',
            title: isFullyPaid ? `Payment Approved: ${invoice.invoice_no}` : `Payment Approved (Installment): ${invoice.invoice_no}`,
            message: isFullyPaid
              ? `Your online payment of ${formattedAmount} for invoice ${invoice.invoice_no} has been processed successfully. Thank you! Your invoice is now fully paid.`
              : `Your online installment payment of ${formattedAmount} for invoice ${invoice.invoice_no} has been processed successfully. Total paid: ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} of ${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`,
          })
        }

        // Notify admin
        await supabase.from('notifications').insert({
          customer_id: null,
          type: 'payment_submitted',
          title: `Online Payment Received: ${invoice.invoice_no}`,
          message: `Online payment of ${invoice.currency || 'LKR'} ${payment.paid_amount} was successfully verified via iPay for invoice ${invoice.invoice_no} (Ref: ${transactionReference}).`,
        })
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })

  } catch (err) {
    console.error('ipay-callback error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
