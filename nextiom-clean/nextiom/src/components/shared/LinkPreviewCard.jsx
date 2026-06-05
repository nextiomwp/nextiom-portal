import React, { useEffect, useState } from 'react';
import { fetchLinkPreview } from '@/lib/linkPreview';
import { ExternalLink } from 'lucide-react';

const spinKeyframes = `
@keyframes lpspin {
  to { transform: rotate(360deg); }
}`;

export default function LinkPreviewCard({ url, isOnBrand, c }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchLinkPreview(url).then(d => { if (!cancelled) setPreview(d); });
    return () => { cancelled = true; };
  }, [url]);

  if (!preview) {
    return (
      <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 8, background: isOnBrand ? 'rgba(255,255,255,0.1)' : c.hover, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: isOnBrand ? 'rgba(255,255,255,0.6)' : c.subText, maxWidth: 420, width: 'fit-content' }}>
        <style>{spinKeyframes}</style>
        <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${c.subText}`, borderTopColor: 'transparent', animation: 'lpspin 0.6s linear infinite', flexShrink: 0 }} />
        Loading preview…
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'inline-block', marginTop: 6, maxWidth: '100%' }}
    >
      <div style={{
        display: 'flex',
        borderRadius: 8,
        overflow: 'hidden',
        border: `1px solid ${isOnBrand ? 'rgba(255,255,255,0.15)' : c.border}`,
        background: isOnBrand ? 'rgba(255,255,255,0.08)' : c.card,
        cursor: 'pointer',
        transition: 'background 0.15s',
        maxWidth: 420,
        minWidth: 0,
      }}
        onMouseEnter={e => { e.currentTarget.style.background = isOnBrand ? 'rgba(255,255,255,0.14)' : c.hover; }}
        onMouseLeave={e => { e.currentTarget.style.background = isOnBrand ? 'rgba(255,255,255,0.08)' : c.card; }}
      >
        {preview.image && (
          <div style={{ width: 70, minHeight: 56, flexShrink: 0, background: c.hover, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img
              src={preview.image}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}
        <div style={{ padding: '8px 10px', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
          {preview.title && (
            <div style={{ fontSize: 12, fontWeight: 600, color: isOnBrand ? '#fff' : c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', wordBreak: 'break-all' }}>
              {preview.title}
            </div>
          )}
          {preview.description && (
            <div style={{ fontSize: 11, color: isOnBrand ? 'rgba(255,255,255,0.7)' : c.subText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', wordBreak: 'break-all' }}>
              {preview.description}
            </div>
          )}
          <div style={{ fontSize: 10, color: isOnBrand ? 'rgba(255,255,255,0.5)' : '#60a5fa', display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden' }}>
            <ExternalLink size={10} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview.domain}</span>
          </div>
        </div>
      </div>
    </a>
  );
}
