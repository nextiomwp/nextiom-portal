import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';

const ACTION_LABELS = {
  new_registration: 'New Registration',
  update: 'Status Update',
  expiration: 'Expiration Alert',
  announcement: 'Announcement',
  account_rejected: 'Account Rejected',
  account_confirmed: 'Account Confirmed',
  admin_login: 'Admin Login',
  ticket: 'Ticket',
  payment: 'Payment',
};

export default function ActivityLogPrintPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('nxt_activity_log_print');
      if (raw) {
        setData(JSON.parse(raw));
        localStorage.removeItem('nxt_activity_log_print');
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (data) setTimeout(() => window.print(), 600);
  }, [data]);

  if (!data) return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Loading…</div>;

  const { logs, settings, dateLabel } = data;
  const logoUrl = settings?.resolvedLogoUrl || '';
  const company = settings?.company_name || 'Nextiom (Pvt) Ltd';
  const phone = settings?.phone || '';
  const website = settings?.website || '';
  const address = settings?.address || '';

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', maxWidth: 900, margin: '0 auto', padding: '32px 24px', color: '#1a1a1a' }}>
      <style>{`@media print { @page { size: A4; margin: 18mm 14mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e87b35', paddingBottom: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {logoUrl && <img src={logoUrl} alt="logo" style={{ height: 52, objectFit: 'contain' }} />}
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, color: '#1a1a1a' }}>{company}</div>
            {address && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{address}</div>}
            {phone && <div style={{ fontSize: 12, color: '#666' }}>{phone}</div>}
            {website && <div style={{ fontSize: 12, color: '#e87b35' }}>{website}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 22, color: '#e87b35', letterSpacing: 1 }}>ACTIVITY LOG</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Generated: {format(new Date(), 'MMM dd, yyyy HH:mm')}</div>
          <div style={{ fontSize: 12, color: '#666' }}>Period: {dateLabel}</div>
          <div style={{ fontSize: 12, color: '#666' }}>Total Entries: {logs.length}</div>
        </div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            {['#', 'User', 'Role', 'Action', 'Description', 'Date & Time'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '9px 10px', fontWeight: 700, fontSize: 10.5, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '1.5px solid #ddd' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={log.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee', color: '#999', fontSize: 11 }}>{i + 1}</td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee', fontWeight: 600 }}>{log.userName || 'Admin'}</td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10.5, fontWeight: 700, background: log.isAdmin ? '#fff3e8' : '#e8f0ff', color: log.isAdmin ? '#e87b35' : '#2563eb' }}>{log.isAdmin ? 'Admin' : 'Customer'}</span>
              </td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee', fontWeight: 600, color: '#444' }}>{ACTION_LABELS[log.type] || log.type || '—'}</td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee', maxWidth: 240 }}>
                <div style={{ fontWeight: 500 }}>{log.title || '—'}</div>
                {log.message && <div style={{ fontSize: 10.5, color: '#888', marginTop: 1 }}>{log.message}</div>}
              </td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', color: '#666' }}>
                {log.created_at ? format(parseISO(log.created_at), 'MMM dd, yyyy HH:mm') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 32, borderTop: '1px solid #eee', paddingTop: 14, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#999' }}>
        <span>{company} — Confidential</span>
        <span>Printed on {format(new Date(), 'MMM dd, yyyy')}</span>
      </div>
    </div>
  );
}
