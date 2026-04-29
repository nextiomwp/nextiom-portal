import React from 'react';
import { Megaphone, Sparkles } from 'lucide-react';

function NewsAnnouncementsCard({ isDark = false, c = {} }) {
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const brand = c.brand || '#E87B35';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.1)';
  const panel2 = c.panel2 || '#f5f5f5';

  return (
    <div style={{
      background: isDark ? 'rgba(28,30,36,0.85)' : 'rgba(255,255,255,0.9)',
      border: `1px solid ${border}`,
      borderRadius: 20,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.25)' : '0 2px 16px rgba(0,0,0,0.06)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Megaphone style={{ width: 15, height: 15, color: brand }} />
        </div>
        <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>News & Announcements</span>
      </div>

      {/* Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: brandLight, alignSelf: 'flex-start' }}>
        <Sparkles style={{ width: 12, height: 12, color: brand }} />
        <span style={{ color: brand, fontSize: 11, fontWeight: 600 }}>Latest from Nextiom</span>
      </div>

      {/* Content */}
      <p style={{ color: subText, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
        Stay informed with the latest updates, system maintenance schedules, and feature releases from Nextiom.
      </p>

      {/* Announcement item */}
      <div style={{ padding: '12px 14px', borderRadius: 12, background: panel2, border: `1px solid ${border}` }}>
        <p style={{ color: text, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>🚀 Platform Update v2.1</p>
        <p style={{ color: subText, fontSize: 11, lineHeight: 1.55, marginBottom: 4 }}>
          New hosting management features and improved dashboard performance are now live.
        </p>
        <p style={{ color: subText, fontSize: 10 }}>Apr 29, 2026</p>
      </div>
    </div>
  );
}

export default NewsAnnouncementsCard;
