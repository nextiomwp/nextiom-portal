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

  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  });

  useEffect(() => {
    getTodayAppointments()
      .then(apts => setTodayApts(apts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hrs}:${mins}:${secs}`);
    };
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    const key = `appt_banner_dismissed_${new Date().toISOString().split('T')[0]}`;
    localStorage.setItem(key, 'true');
    setDismissed(true);
    onDismiss?.();
  };

  const upcomingApts = todayApts.filter(apt => {
    const { time } = getEffectiveDateTime(apt);
    if (!time) return false;
    return time >= currentTime;
  });

  if (loading || dismissed || upcomingApts.length === 0) return null;

  const nextApt = upcomingApts[0];
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
              📅 You have {upcomingApts.length} appointment{upcomingApts.length > 1 ? 's' : ''} left today
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--brand-color)', fontWeight: 600 }}>
                <TypeIcon size={14} />
                {getAppointmentTypeLabel(nextApt.appointment_type)}
                {formattedTime && <><Clock size={12} /> {formattedTime}</>}
                {nextApt.customers?.name && <span style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#888' }}>· {nextApt.customers.name}</span>}
              </div>
              {upcomingApts.length > 1 && (
                <span style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.5)' : '#999' }}>
                  +{upcomingApts.length - 1} more
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

  useEffect(() => {
    const getShownPopups = () => {
      try {
        return JSON.parse(localStorage.getItem('shown_appt_popups') || '[]');
      } catch (e) {
        return [];
      }
    };

    const markPopupShown = (id) => {
      try {
        const shown = getShownPopups();
        if (!shown.includes(id)) {
          shown.push(id);
          localStorage.setItem('shown_appt_popups', JSON.stringify(shown));
        }
      } catch (e) {}
    };

    const checkUpcoming = async () => {
      try {
        const apts = await getTodayAppointments();
        if (!apts.length) return;

        const now = new Date();
        const shownList = getShownPopups();

        for (const apt of apts) {
          const { time } = getEffectiveDateTime(apt);
          if (!time) continue;
          const aptTime = new Date(`${new Date().toISOString().split('T')[0]}T${time}`);
          const diffMs = aptTime - now;
          const diffMins = Math.round(diffMs / 60000);

          // Show popup at appointment time (starting now, within 0 to -5 minutes)
          const isStartingNow = diffMins <= 0 && diffMins >= -5;
          const keyNow = apt.id + '_now';
          if (isStartingNow && !shownList.includes(keyNow)) {
            markPopupShown(keyNow);
            setPopup({ apt, status: 'now', minsLeft: diffMins });
            return;
          }

          // Show popup 5 minutes before
          const key5 = apt.id + '_5';
          if (diffMins > 0 && diffMins <= 5 && !shownList.includes(key5)) {
            markPopupShown(key5);
            setPopup({ apt, status: '5', minsLeft: diffMins });
            return;
          }

          // Show popup 30 minutes before
          const key30 = apt.id + '_30';
          if (diffMins > 0 && diffMins <= 30 && !shownList.includes(key30)) {
            markPopupShown(key30);
            setPopup({ apt, status: '30', minsLeft: diffMins });
            return;
          }
        }
      } catch (e) {
        // silently fail
      }
    };

    checkUpcoming();
    const interval = setInterval(checkUpcoming, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (!popup) return null;

  const { apt, status, minsLeft } = popup;
  const TypeIcon = TYPE_ICONS[apt.appointment_type] || Calendar;
  const { time } = getEffectiveDateTime(apt);
  const formattedTime = time ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

  let reminderLabel = '';
  if (status === 'now') {
    reminderLabel = '🚨 Starting now!';
  } else if (status === '5') {
    reminderLabel = `⚠️ Starting in ${minsLeft} minutes!`;
  } else {
    reminderLabel = `In ${minsLeft} minutes`;
  }

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
                  {reminderLabel}
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
