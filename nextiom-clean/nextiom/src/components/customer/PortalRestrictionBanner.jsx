import React from 'react';
import { AlertTriangle, CalendarRange, Clock3 } from 'lucide-react';

function PortalRestrictionBanner({ restriction, c, isDark = false }) {
  if (!restriction?.blocked) return null;

  const message = restriction.block?.message || 'Customer requests and payments are temporarily paused.';
  const startDate = restriction.block?.startDate || '';
  const endDate = restriction.block?.endDate || '';

  return (
    <div
      style={{
        marginBottom: 20,
        borderRadius: 18,
        border: `1px solid ${isDark ? 'rgba(232,123,53,0.22)' : 'rgba(232,123,53,0.18)'}`,
        background: isDark ? 'linear-gradient(135deg, rgba(232,123,53,0.16), rgba(28,30,36,0.92))' : 'linear-gradient(135deg, rgba(232,123,53,0.12), rgba(255,255,255,0.96))',
        boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.18)' : '0 6px 24px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', gap: 14, padding: '18px 20px', alignItems: 'flex-start' }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(232,123,53,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <AlertTriangle size={20} style={{ color: c.brand }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ color: c.text, fontWeight: 800, fontSize: 14 }}>Customer actions paused</div>
            <span style={{ padding: '3px 8px', borderRadius: 999, background: 'rgba(232,123,53,0.14)', color: c.brand, fontSize: 11, fontWeight: 700 }}>Requests locked</span>
          </div>
          <div style={{ color: c.subText, fontSize: 13, lineHeight: 1.6, marginTop: 6 }}>{message}</div>

          {(startDate || endDate) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {startDate && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: c.panel2, color: c.text, fontSize: 12, border: `1px solid ${c.border}` }}>
                  <CalendarRange size={13} style={{ color: c.brand }} />
                  Starts {startDate}
                </div>
              )}
              {endDate && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: c.panel2, color: c.text, fontSize: 12, border: `1px solid ${c.border}` }}>
                  <Clock3 size={13} style={{ color: c.brand }} />
                  Ends {endDate}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PortalRestrictionBanner;