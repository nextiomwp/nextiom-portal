import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Loader2, RefreshCw, AlertCircle, Phone, Calendar, Tag } from 'lucide-react';
import { getSmsLogs } from '@/lib/sms';

function SmsLogDialog({ open, onClose, customer, serviceFilter, c, isDark = true }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && customer?.id) {
      fetchLogs();
    }
  }, [open, customer]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch logs for the specific customer
      const data = await getSmsLogs({ limit: 100, customerId: customer.id });
      setLogs(data);
    } catch (err) {
      console.error('Error fetching SMS logs:', err);
      setError(err?.message || 'Failed to load SMS logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!serviceFilter) return true;
    const { type, value, planName } = serviceFilter;
    const msgLower = (log.message || '').toLowerCase();
    const typeLower = (log.type || '').toLowerCase();
    
    if (type === 'domain') {
      if (!value) return true;
      return msgLower.includes(value.toLowerCase());
    }
    
    if (type === 'email') {
      if (!value) return true;
      return msgLower.includes(value.toLowerCase());
    }
    
    if (type === 'hosting') {
      const hasDomain = value && msgLower.includes(value.toLowerCase());
      const hasPlan = planName && msgLower.includes(planName.toLowerCase());
      if (value || planName) {
        return hasDomain || hasPlan;
      }
      return typeLower.includes('hosting');
    }
    
    return true;
  });

  if (!open) return null;

  const text = c.text || '#fff';
  const subText = c.subText || '#a0a0a0';
  const card = c.card || '#1C1E24';
  const border = c.border || 'rgba(255,255,255,0.06)';
  const borderStrong = c.borderStrong || 'rgba(255,255,255,0.10)';
  const brand = c.brand || 'var(--brand-color)';
  const overlay = 'rgba(0,0,0,0.6)';

  // Style helper for SMS Type badge
  const getTypeStyles = (type) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('otp')) return { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' };
    if (t.includes('expiry') || t.includes('reminder')) return { bg: 'rgba(249,115,22,0.15)', color: '#f97316' };
    if (t.includes('purchase')) return { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' };
    return { bg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: subText };
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: overlay,
        zIndex: 110, // Higher than regular dialogs
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: card,
          border: `1px solid ${borderStrong}`,
          borderRadius: 16,
          width: '100%',
          maxWidth: 680,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.005)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: isDark ? 'rgba(232,123,53,0.12)' : 'rgba(232,123,53,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MessageSquare size={18} color={brand} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: text }}>
                SMS Logs
              </h2>
              <p style={{ fontSize: 11.5, color: subText, margin: '2px 0 0' }}>
                {customer?.name || 'Customer'} {customer?.email ? `(${customer.email})` : ''}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={fetchLogs}
              disabled={loading}
              title="Refresh Logs"
              style={{
                background: 'none',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                color: subText,
                padding: 6,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} style={{ color: subText }} />
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: subText,
                padding: 6,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, scrollbarWidth: 'thin' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
              <Loader2 className="animate-spin" size={32} style={{ color: brand }} />
              <span style={{ fontSize: 13, color: subText }}>Fetching SMS history...</span>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 12, textAlign: 'center' }}>
              <AlertCircle size={36} color="#ef4444" />
              <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 500 }}>{error}</span>
              <button
                onClick={fetchLogs}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: brand,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12, textAlign: 'center' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: subText
                }}
              >
                <MessageSquare size={24} style={{ opacity: 0.4 }} />
              </div>
              <span style={{ fontSize: 13, color: subText, fontWeight: 500 }}>
                No SMS logs found
              </span>
              <span style={{ fontSize: 11, color: subText, maxWidth: 300, display: 'inline-block' }}>
                {serviceFilter?.value 
                  ? `There are no recorded SMS messages containing "${serviceFilter.value}" for this customer.`
                  : 'There are no recorded SMS messages sent to this customer.'
                }
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredLogs.map((log) => {
                const typeStyle = getTypeStyles(log.type);
                const isFailed = String(log.status).toLowerCase() === 'failed';
                
                return (
                  <div
                    key={log.id}
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                      border: `1px solid ${border}`,
                      borderRadius: 12,
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; }}
                  >
                    {/* Metadata Header */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                        {/* Type Badge */}
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: typeStyle.bg,
                            color: typeStyle.color,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Tag size={10} />
                          {log.type || 'unknown'}
                        </span>

                        {/* Phone Number */}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: text, fontWeight: 500 }}>
                          <Phone size={12} style={{ color: subText }} />
                          {log.phone || 'N/A'}
                        </span>
                      </div>

                      {/* Date and Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: subText }}>
                          <Calendar size={11} />
                          {log.sent_at ? new Date(log.sent_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                        </span>

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 20,
                            background: isFailed ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                            color: isFailed ? '#f87171' : '#4ade80',
                            textTransform: 'uppercase'
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              background: isFailed ? '#ef4444' : '#22c55e'
                            }}
                          />
                          {log.status || 'sent'}
                        </span>
                      </div>
                    </div>

                    {/* Message Box */}
                    <div
                      style={{
                        background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'}`,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: text,
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit'
                      }}
                    >
                      {log.message}
                    </div>

                    {/* Error Notice */}
                    {isFailed && log.error_msg && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 6,
                          padding: '8px 12px',
                          background: 'rgba(239,68,68,0.08)',
                          border: '1px solid rgba(239,68,68,0.15)',
                          borderRadius: 6,
                          fontSize: 12,
                          color: '#f87171'
                        }}
                      >
                        <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                        <div>
                          <strong style={{ fontWeight: 600 }}>Error:</strong> {log.error_msg}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: `1px solid ${border}`,
            display: 'flex',
            justifyContent: 'flex-end',
            background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.005)'
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: `1.5px solid ${border}`,
              background: 'transparent',
              color: text,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default SmsLogDialog;
