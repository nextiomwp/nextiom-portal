import React, { useState, useEffect, useRef } from 'react';
import { Calendar, X, Clock, ChevronRight, Video, Phone, Building2, Bell, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTodayAppointments, getAppointmentTypeLabel, getEffectiveDateTime } from '@/lib/appointments';

const TYPE_ICONS = {
  office_visit: Building2,
  zoom_meeting: Video,
  phone_call: Phone,
};

// ── Today's Appointment Banner ─────────────────────────────────────────────────
export function TodayAppointmentBanner({ c, isDark, onViewAppointments, onDismiss }) {
  const [todayApts, setTodayApts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    const key = `appt_banner_dismissed_${new Date().toISOString().split('T')[0]}`;
    return localStorage.getItem(key) === 'true';
  });

  useEffect(() => {
    getTodayAppointments()
      .then(apts => setTodayApts(apts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDismiss = () => {
    const key = `appt_banner_dismissed_${new Date().toISOString().split('T')[0]}`;
    localStorage.setItem(key, 'true');
    setDismissed(true);
    onDismiss?.();
  };

  if (loading || dismissed || todayApts.length === 0) return null;

  const nextApt = todayApts[0];
  const TypeIcon = TYPE_ICONS[nextApt.appointment_type] || Calendar;
  const { time } = getEffectiveDateTime(nextApt);
  const formattedTime = time
    ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          position: 'relative',
          margin: '0 0 24px',
          borderRadius: 16,
          overflow: 'hidden',
          background: isDark
            ? 'linear-gradient(135deg, #1e1510 0%, #2a1f14 50%, #1a1610 100%)'
            : 'linear-gradient(135deg, #fff5ee 0%, #fde9d5 50%, #fff8f2 100%)',
          border: `1px solid rgba(232,123,53,0.35)`,
          boxShadow: isDark
            ? '0 4px 24px rgba(232,123,53,0.12), 0 0 0 1px rgba(232,123,53,0.1)'
            : '0 4px 24px rgba(232,123,53,0.1)',
        }}
      >
        {/* Animated gradient accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--brand-color), transparent)',
          animation: 'shimmer 2s infinite',
        }} />

        <style>{`
          @keyframes shimmer {
            0% { opacity: 0.4; }
            50% { opacity: 1; }
            100% { opacity: 0.4; }
          }
        `}</style>

        <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Icon + pulse */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(232,123,53,0.15)',
              border: '1px solid rgba(232,123,53,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Calendar size={22} color="var(--brand-color)" />
            </div>
            <span style={{
              position: 'absolute', top: -3, right: -3,
              width: 12, height: 12, borderRadius: '50%',
              background: 'var(--brand-color)',
              border: isDark ? '2px solid #1e1510' : '2px solid #fff5ee',
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#1a1a1a', marginBottom: 4 }}>
              📅 You have {todayApts.length} appointment{todayApts.length > 1 ? 's' : ''} today
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--brand-color)', fontWeight: 600 }}>
                <TypeIcon size={14} />
                {getAppointmentTypeLabel(nextApt.appointment_type)}
                {formattedTime && <><Clock size={12} /> {formattedTime}</>}
                {nextApt.customers?.name && <span style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#888' }}>· {nextApt.customers.name}</span>}
              </div>
              {todayApts.length > 1 && (
                <span style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.5)' : '#999' }}>
                  +{todayApts.length - 1} more
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={onViewAppointments}
              style={{
                padding: '8px 16px', borderRadius: 9,
                background: 'var(--brand-color)', border: 'none',
                color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 3px 10px rgba(232,123,53,0.4)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <Eye size={13} /> View Appointments
            </button>
            <button
              onClick={handleDismiss}
              style={{
                padding: '8px 10px', borderRadius: 9,
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                color: isDark ? 'rgba(255,255,255,0.5)' : '#888', cursor: 'pointer', display: 'flex',
                transition: 'all 0.15s',
              }}
              title="Dismiss for today"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Appointment Reminder Popup ─────────────────────────────────────────────────
export function AppointmentReminderPopup({ c, isDark }) {
  const [popup, setPopup] = useState(null);
  const shownRef = useRef(new Set());

  useEffect(() => {
    const checkUpcoming = async () => {
      try {
        const apts = await getTodayAppointments();
        if (!apts.length) return;

        const now = new Date();
        for (const apt of apts) {
          const { time } = getEffectiveDateTime(apt);
          if (!time) continue;
          const aptTime = new Date(`${new Date().toISOString().split('T')[0]}T${time}`);
          const diffMs = aptTime - now;
          const diffMins = Math.round(diffMs / 60000);

          // Show popup 30 minutes before
          if (diffMins > 0 && diffMins <= 30 && !shownRef.current.has(apt.id + '_30')) {
            shownRef.current.add(apt.id + '_30');
            setPopup({ apt, minsLeft: diffMins });
            return;
          }
          // Show popup 5 minutes before
          if (diffMins > 0 && diffMins <= 5 && !shownRef.current.has(apt.id + '_5')) {
            shownRef.current.add(apt.id + '_5');
            setPopup({ apt, minsLeft: diffMins });
            return;
          }
        }
      } catch (e) {
        // silently fail
      }
    };

    checkUpcoming();
    const interval = setInterval(checkUpcoming, 60000); // check every minute
    return () => clearInterval(interval);
  }, []);

  if (!popup) return null;

  const { apt, minsLeft } = popup;
  const TypeIcon = TYPE_ICONS[apt.appointment_type] || Calendar;
  const { time } = getEffectiveDateTime(apt);
  const formattedTime = time ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 80, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 80, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 320, zIndex: 200,
          background: isDark
            ? 'linear-gradient(135deg, #1a1e28 0%, #1e2230 100%)'
            : '#fff',
          border: `1px solid rgba(232,123,53,0.4)`,
          borderRadius: 16,
          boxShadow: isDark
            ? '0 16px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(232,123,53,0.15)'
            : '0 16px 50px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}
      >
        {/* Top accent */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--brand-color), #f97316)' }} />

        <div style={{ padding: '18px 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: 'rgba(232,123,53,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Bell size={16} color="var(--brand-color)" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Appointment Reminder</div>
                <div style={{ fontSize: 11, color: 'var(--brand-color)', fontWeight: 600 }}>
                  {minsLeft <= 5 ? '⚠️ Starting very soon!' : `In ${minsLeft} minutes`}
                </div>
              </div>
            </div>
            <button
              onClick={() => setPopup(null)}
              style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: 2 }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Appointment info */}
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${c.border}`,
            marginBottom: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <TypeIcon size={14} color="var(--brand-color)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{getAppointmentTypeLabel(apt.appointment_type)}</span>
            </div>
            <div style={{ fontSize: 12, color: c.subText, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={11} /> {formattedTime}
              </div>
              {apt.customers?.name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontWeight: 600, color: c.text }}>{apt.customers.name}</span>
                  {apt.customers.company && <span>· {apt.customers.company}</span>}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setPopup(null)}
            style={{
              width: '100%', padding: '9px', borderRadius: 9,
              background: 'var(--brand-color)', border: 'none',
              color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            Got it!
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
