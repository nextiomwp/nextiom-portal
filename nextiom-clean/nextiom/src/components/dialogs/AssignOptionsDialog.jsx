import React from 'react';
import { X, Package, Globe, Server, Mail } from 'lucide-react';

const OPTIONS = [
  { id: 'product', label: 'Assign Product & Generate License', desc: 'Assign a software product with a license key', icon: Package, color: '#a78bfa' },
  { id: 'domain', label: 'Assign Domains', desc: 'Assign approved domain(s) to a customer', icon: Globe, color: '#60a5fa' },
  { id: 'hosting', label: 'Assign Hostings', desc: 'Assign hosting package(s) to a customer', icon: Server, color: '#4ade80' },
  { id: 'email', label: 'Assign Emails', desc: 'Assign email service(s) to a customer', icon: Mail, color: '#fb923c' },
];

function AssignOptionsDialog({ open, onClose, onSelect, customer, c }) {
  if (!open) return null;

  const text = c.text || '#fff';
  const subText = c.subText || '#a0a0a0';
  const card = c.card || '#1C1E24';
  const border = c.border || 'rgba(255,255,255,0.06)';
  const borderStrong = c.borderStrong || 'rgba(255,255,255,0.10)';
  const overlay = 'rgba(0,0,0,0.6)';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: overlay, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{
          background: card, border: `1px solid ${borderStrong}`,
          borderRadius: 16, width: '100%', maxWidth: 480,
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: text }}>Assign to Customer</div>
            <div style={{ fontSize: 12, color: subText, marginTop: 2 }}>
              {customer?.name || 'Selected customer'}
              {customer?.email && <span> — {customer.email}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: subText, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Options */}
        <div style={{ padding: 16 }}>
          {OPTIONS.map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => { onSelect(opt.id); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  width: '100%', padding: '14px 16px',
                  borderRadius: 12, border: `1px solid ${border}`,
                  background: 'transparent', cursor: 'pointer',
                  color: text, textAlign: 'left', marginBottom: 8,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = opt.color;
                  e.currentTarget.style.background = opt.color + '12';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = border;
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: opt.color + '1e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={18} color={opt.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: subText, marginTop: 1 }}>{opt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px', borderTop: `1px solid ${border}`,
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: `1px solid ${border}`,
              background: 'transparent', color: subText,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssignOptionsDialog;
