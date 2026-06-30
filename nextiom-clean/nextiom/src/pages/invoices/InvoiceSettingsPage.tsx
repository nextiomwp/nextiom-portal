import React, { useState, useEffect, useRef } from 'react'
import { Upload, X, Save, ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { InvoiceSettings, getInvoiceSettings, saveInvoiceSettings, uploadLogo, resolveLogoUrl, defaultSettings } from '@/lib/invoices'

interface Props {
  c: any
  isDark: boolean
  onBack: () => void
}

export default function InvoiceSettingsPage({ c, isDark, onBack }: Props) {
  const { toast } = useToast()
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
  })

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    const listener = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  const fileRef = useRef<HTMLInputElement>(null)
  const [s, setS] = useState<InvoiceSettings>(defaultSettings())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  // logo_url in `s` holds a STORAGE PATH (or legacy public URL / data URL).
  // displayLogo is the renderable URL we put in <img src>. We re-resolve
  // whenever logo_url changes.
  const [displayLogo, setDisplayLogo] = useState('')

  useEffect(() => { getInvoiceSettings().then(setS) }, [])
  useEffect(() => {
    let cancelled = false
    resolveLogoUrl(s.logo_url).then(url => { if (!cancelled) setDisplayLogo(url) })
    return () => { cancelled = true }
  }, [s.logo_url])

  const update = (field: keyof InvoiceSettings, value: any) =>
    setS(prev => ({ ...prev, [field]: value }))

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadLogo(file)
      update('logo_url', url)
      toast({ title: 'Logo uploaded' })
    } catch {
      const reader = new FileReader()
      reader.onload = ev => { if (ev.target?.result) update('logo_url', ev.target.result as string) }
      reader.readAsDataURL(file)
      toast({ title: 'Logo loaded locally. Set up Supabase Storage for permanent hosting.' })
    } finally { setUploading(false) }
  }

  const handleSave = async () => {
    setSaving(true)
    try { await saveInvoiceSettings(s); toast({ title: 'Company info saved' }) }
    catch { toast({ title: 'Failed to save', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  const card: React.CSSProperties = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: c.subText, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }
  const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: `1px solid ${c.borderStrong}`, borderRadius: 8, color: c.text, fontSize: 13, background: isDark ? '#22252C' : '#fff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
  const secTitle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }
  const btnPrimary: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: c.brand, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }
  const btnOutline: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: `1px solid ${c.border}`, background: c.card, color: c.text, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: isMobile ? '0 8px 16px' : '0 0 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: c.text }}>Invoice settings</h2>
            <p style={{ fontSize: 13, color: c.subText, marginTop: 2 }}>Company info and bank details shown on every invoice</p>
          </div>
        </div>
        {!isMobile && (
          <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
            <Save size={15} /> {saving ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>

      {/* Logo */}
      <div style={card}>
        <p style={secTitle}>Company logo</p>
        {s.logo_url ? (
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 16 }}>
            <img src={displayLogo} alt="logo" style={{ maxHeight: 56, maxWidth: 180, objectFit: 'contain', borderRadius: 8, border: `1px solid ${c.border}`, padding: 8, background: '#fff' }} />
            <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto' }}>
              <button style={{ ...btnOutline, flex: isMobile ? 1 : 'none', justifyContent: 'center' }} onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload size={14} /> Replace
              </button>
              <button style={{ ...btnOutline, flex: isMobile ? 1 : 'none', justifyContent: 'center', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => update('logo_url', '')}>
                <X size={14} /> Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ width: '100%', border: `2px dashed ${c.borderStrong}`, borderRadius: 10, padding: '32px 16px', textAlign: 'center', color: c.subText, cursor: 'pointer', background: 'transparent', fontFamily: 'inherit' }}
          >
            <Upload size={28} style={{ margin: '0 auto 8px', opacity: 0.4, display: 'block' }} />
            <div style={{ fontSize: 13, fontWeight: 500 }}>{uploading ? 'Uploading…' : 'Click to upload logo'}</div>
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.6 }}>PNG, SVG, or JPG — shown on all printed invoices</div>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
      </div>

      {/* Company details */}
      <div style={card}>
        <p style={secTitle}>Company details</p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={lbl}>Company name</label><input style={inp} value={s.company_name} onChange={e => update('company_name', e.target.value)} /></div>
          <div><label style={lbl}>Registration no.</label><input style={inp} value={s.reg_no} onChange={e => update('reg_no', e.target.value)} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={lbl}>Phone</label><input style={inp} value={s.phone} onChange={e => update('phone', e.target.value)} /></div>
          <div><label style={lbl}>Website</label><input style={inp} value={s.website} onChange={e => update('website', e.target.value)} /></div>
        </div>
        <div><label style={lbl}>Address</label><textarea style={{ ...inp, resize: 'vertical', minHeight: 60 }} value={s.address} onChange={e => update('address', e.target.value)} rows={2} /></div>
      </div>

      {/* Bank details */}
      <div style={card}>
        <p style={secTitle}>Bank details</p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={lbl}>Bank name</label><input style={inp} value={s.bank_name} onChange={e => update('bank_name', e.target.value)} /></div>
          <div><label style={lbl}>Branch</label><input style={inp} value={s.bank_branch} onChange={e => update('bank_branch', e.target.value)} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          <div><label style={lbl}>Account name</label><input style={inp} value={s.account_name} onChange={e => update('account_name', e.target.value)} /></div>
          <div><label style={lbl}>Account number</label><input style={inp} value={s.account_no} onChange={e => update('account_no', e.target.value)} /></div>
        </div>
      </div>

      {/* Default notes */}
      <div style={card}>
        <p style={secTitle}>Default invoice notes</p>
        <textarea style={{ ...inp, resize: 'vertical', minHeight: 80 }} value={s.default_notes} onChange={e => update('default_notes', e.target.value)} rows={4} placeholder="Payment terms shown on every new invoice…" />
      </div>
      
      {/* Retention Settings */}
      <div style={card}>
        <p style={secTitle}>Recycle Bin & Retention</p>
        <div>
          <label style={lbl}>Auto-delete period (hours)</label>
          <input
            type="number"
            style={inp}
            value={s.recycle_bin_retention_hours ?? 24}
            onChange={e => update('recycle_bin_retention_hours', parseInt(e.target.value) || 0)}
            min={1}
            max={8760}
          />
          <p style={{ fontSize: 12, color: c.subText, marginTop: 6, lineHeight: 1.4 }}>
            Deleted invoices will remain in the recycle bin and can be restored for this period before being permanently deleted from the database.
          </p>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', opacity: saving ? 0.7 : 1 }}>
        <Save size={15} /> {saving ? 'Saving…' : 'Save all changes'}
      </button>
    </div>
  )
}
