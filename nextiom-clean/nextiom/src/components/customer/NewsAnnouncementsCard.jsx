import React, { useState, useEffect } from 'react';
import { Megaphone, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

function NewsAnnouncementsCard({ isDark = false, c = {}, customerId }) {
  const [hovered, setHovered] = useState(false);
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const brand = c.brand || '#E87B35';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.1)';
  const panel2 = c.panel2 || '#f5f5f5';

  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    if (!customerId) return;
    supabase
      .from('notifications')
      .select('title, message, created_at, start_date, end_date')
      .eq('type', 'announcement')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data && Array.isArray(data)) {
          const now = new Date();
          const active = data.find(ann => {
            if (ann.start_date && new Date(ann.start_date) > now) return false;
            if (ann.end_date && new Date(ann.end_date) < now) return false;
            return true;
          });
          setAnnouncement(active || null);
        }
      });
  }, [customerId]);

  const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isDark ? 'rgba(28,30,36,0.85)' : 'rgba(255,255,255,0.9)',
        border: `1px solid ${hovered ? brand : border}`,
        borderRadius: 20,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: hovered
          ? (isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(232,123,53,0.08)')
          : (isDark ? '0 4px 24px rgba(0,0,0,0.25)' : '0 2px 16px rgba(0,0,0,0.06)'),
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box',
        gap: 14,
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Megaphone style={{ width: 15, height: 15, color: brand }} />
        </div>
        <span style={{ color: text, fontWeight: 700, fontSize: 16 }}>News & Announcements</span>
      </div>

      {/* Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: brandLight, alignSelf: 'flex-start' }}>
        <Sparkles style={{ width: 12, height: 12, color: brand }} />
        <span style={{ color: brand, fontSize: 12, fontWeight: 600 }}>Latest from Nextiom</span>
      </div>

      {/* Announcement */}
      {announcement ? (
        <div 
          className="no-scrollbar"
          style={{ 
            padding: '12px 14px', 
            borderRadius: 12, 
            background: panel2, 
            border: `1px solid ${border}`,
            flex: 1,
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <p style={{ color: text, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{announcement.title}</p>
          <p style={{ color: subText, fontSize: 13, lineHeight: 1.6, marginBottom: 8, whiteSpace: 'pre-wrap' }}>
            {announcement.message}
          </p>
          <p style={{ color: subText, fontSize: 11 }}>{fmtDate(announcement.created_at)}</p>
        </div>
      ) : (
        <div 
          className="no-scrollbar"
          style={{ 
            padding: '12px 14px', 
            borderRadius: 12, 
            background: panel2, 
            border: `1px solid ${border}`,
            flex: 1,
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <p style={{ color: subText, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            No announcements yet. Check back soon for the latest updates from Nextiom.
          </p>
        </div>
      )}
    </div>
  );
}

export default NewsAnnouncementsCard;
