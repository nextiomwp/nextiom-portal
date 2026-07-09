import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar, Clock, Users, CheckCircle, XCircle, Edit2,
  Video, Phone, Building2, Loader2, Filter, Search,
  ChevronLeft, ChevronRight, AlertCircle, Send, X,
  Check, RefreshCw, CalendarDays, Bell, Info,
  Settings, Trash2, Plus, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAllAppointments,
  updateAppointmentAdmin,
  deleteAppointment,
  createAppointmentAdmin,
  getAppointmentTypeLabel,
  getStatusColor,
  getStatusLabel,
  getEffectiveDateTime,
  sendAppointmentNotification,
  sendAdminAppointmentNotification,
  getAppointmentSettings,
} from '@/lib/appointments';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import AppointmentSettingsSection from '@/components/admin/AppointmentSettingsSection';

const TYPE_ICONS = {
  office_visit: Building2,
  zoom_meeting: Video,
  phone_call: Phone,
};

const TYPE_OPTIONS = [
  { value: 'office_visit', label: 'Office Visit', desc: 'Visit us in person at our office', icon: Building2, color: '#E87B35' },
  { value: 'zoom_meeting', label: 'Zoom Meeting', desc: 'Video call via Zoom', icon: Video, color: '#2563eb' },
  { value: 'phone_call', label: 'Phone Call', desc: 'Telephone discussion', icon: Phone, color: '#16a34a' },
];

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Calendar View ─────────────────────────────────────────────────────────────
function CalendarView({ appointments, onSelectDate, selectedDate, c, isDark }) {
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0,0,0,0);

  const aptMap = {};
  appointments.forEach(apt => {
    const { date } = getEffectiveDateTime(apt);
    if (!date) return;
    if (!aptMap[date]) aptMap[date] = [];
    aptMap[date].push(apt);
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${c.border}` }}>
        <button type="button" onClick={prevMonth} style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', border: 'none', color: c.text, cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex' }}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: c.text }}>{MONTH_NAMES[viewMonth]} {viewYear}</div>
          <div style={{ fontSize: 11, color: c.subText }}>{appointments.length} total appointments</div>
        </div>
        <button type="button" onClick={nextMonth} style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', border: 'none', color: c.text, cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '12px 16px 4px', gap: 2 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: c.subText, padding: '4px 0', letterSpacing: 0.5 }}>{d}</div>
        ))}
      </div>

      {/* Calendar cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '4px 16px 16px', gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const cellDate = new Date(dateStr); cellDate.setHours(0,0,0,0);
          const isToday = cellDate.getTime() === today.getTime();
          const isSelected = selectedDate === dateStr;
          const apts = aptMap[dateStr] || [];
          const hasApts = apts.length > 0;

          const statusColors = [...new Set(apts.map(a => getStatusColor(a.status).text))].slice(0, 3);

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(isSelected ? null : dateStr)}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1',
                borderRadius: 10,
                border: isSelected ? `2px solid var(--brand-color)` : isToday ? `2px solid ${c.border}` : '2px solid transparent',
                background: isSelected ? 'var(--brand-color)' : isToday ? (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)') : hasApts ? (isDark ? 'rgba(232,123,53,0.06)' : 'rgba(232,123,53,0.04)') : 'transparent',
                color: isSelected ? '#fff' : c.text,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isToday || isSelected ? 700 : 400,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; }}
              onMouseLeave={e => {
                if (!isSelected) e.currentTarget.style.background = hasApts ? (isDark ? 'rgba(232,123,53,0.06)' : 'rgba(232,123,53,0.04)') : 'transparent';
              }}
            >
              {day}
              {hasApts && (
                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {statusColors.map((col, ci) => (
                    <span key={ci} style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#fff' : col, flexShrink: 0 }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Counter Propose Modal ─────────────────────────────────────────────────────
function CounterProposeModal({ appointment, onClose, onSubmit, settings, c, isDark }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const startTime = settings?.booking_start_time || '09:00:00';
  const endTime = settings?.booking_end_time || '15:00:00';
  const duration = settings?.slot_duration_minutes || 60;

  const slots = [];
  const [startH] = startTime.split(':').map(Number);
  const [endH] = endTime.split(':').map(Number);
  const startMins = startH * 60;
  const endMins = endH * 60;
  for (let m = startMins; m < endMins; m += duration) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const label = `${h % 12 === 0 ? 12 : h % 12}:${String(min).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    const value = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
    slots.push({ value, label });
  }

  const handleSubmit = async () => {
    if (!date || !time) return;
    setSubmitting(true);
    try {
      await onSubmit({ date, time, notes });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}
    onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        style={{
          background: c.card, border: `1px solid ${c.border}`, borderRadius: 20,
          width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto',
          boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.5)' : '0 25px 60px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ padding: '24px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text, margin: 0 }}>Suggest New Time</h3>
            <p style={{ fontSize: 12, color: c.subText, margin: '4px 0 0' }}>Propose an alternative date/time to the customer</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: c.text, display: 'block', marginBottom: 8 }}>New Date</label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setDate(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: `1px solid ${c.border}`,
                background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                color: c.text, fontSize: 14, boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: c.text, display: 'block', marginBottom: 8 }}>New Time</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 6 }}>
              {slots.map(slot => (
                <button key={slot.value} type="button" onClick={() => setTime(slot.value)} style={{
                  padding: '8px 4px', borderRadius: 8,
                  border: time === slot.value ? `2px solid var(--brand-color)` : `1px solid ${c.border}`,
                  background: time === slot.value ? 'var(--brand-color-light)' : 'transparent',
                  color: time === slot.value ? 'var(--brand-color)' : c.text,
                  fontSize: 12, fontWeight: time === slot.value ? 700 : 400, cursor: 'pointer',
                }}>
                  {slot.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: c.text, display: 'block', marginBottom: 8 }}>Note to Customer (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Explain why you're suggesting a different time..."
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: `1px solid ${c.border}`,
                background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                color: c.text, fontSize: 13, resize: 'vertical', fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px', borderRadius: 10,
              border: `1px solid ${c.border}`, background: 'transparent',
              color: c.text, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!date || !time || submitting}
              style={{
                flex: 1, padding: '10px', borderRadius: 10,
                background: !date || !time ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') : 'var(--brand-color)',
                border: 'none',
                color: !date || !time ? c.subText : '#fff',
                fontWeight: 600, fontSize: 14,
                cursor: (!date || !time || submitting) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Suggest Time
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Reject Reason Modal ────────────────────────────────────────────────────────
function RejectReasonModal({ onClose, onSubmit, c, isDark }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(reason);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}
    onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        style={{
          background: c.card, border: `1px solid ${c.border}`, borderRadius: 20,
          width: '100%', maxWidth: 450,
          boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.5)' : '0 25px 60px rgba(0,0,0,0.15)',
          padding: 24,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text, margin: '0 0 8px' }}>Reject Appointment</h3>
        <p style={{ fontSize: 13, color: c.subText, margin: '0 0 16px' }}>Please provide a reason or note explaining why this appointment is being rejected. The customer will be notified.</p>

        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. We are fully booked at this hour, please select another slot."
          rows={4}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            border: `1px solid ${c.border}`,
            background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
            color: c.text, fontSize: 13, resize: 'vertical', fontFamily: 'inherit',
            outline: 'none', boxSizing: 'border-box', marginBottom: 16,
          }}
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 10,
            border: `1px solid ${c.border}`, background: 'transparent',
            color: c.text, fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
            style={{
              flex: 1, padding: '10px', borderRadius: 10,
              background: !reason.trim() ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') : '#ef4444',
              border: 'none',
              color: !reason.trim() ? c.subText : '#fff',
              fontWeight: 600, fontSize: 13,
              cursor: (!reason.trim() || submitting) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            Reject Request
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Delete Confirmation Modal ──────────────────────────────────────────────────
function DeleteConfirmationModal({ onClose, onSubmit, c, isDark }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}
    onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        style={{
          background: c.card, border: `1px solid ${c.border}`, borderRadius: 20,
          width: '100%', maxWidth: 400,
          boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.5)' : '0 25px 60px rgba(0,0,0,0.15)',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Trash2 size={24} color="#ef4444" />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text, margin: '0 0 8px' }}>Delete Appointment</h3>
        <p style={{ fontSize: 13, color: c.subText, margin: '0 0 20px', lineHeight: 1.4 }}>Are you sure you want to delete this appointment? This action cannot be undone and the record will be permanently deleted.</p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 10,
            border: `1px solid ${c.border}`, background: 'transparent',
            color: c.text, fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            style={{
              flex: 1, padding: '10px', borderRadius: 10,
              background: '#ef4444', border: 'none',
              color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            Confirm Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Create Appointment Modal ───────────────────────────────────────────────────
function CreateAppointmentModal({ onClose, onSubmit, settings, c, isDark }) {
  const [customers, setCustomers] = useState([]);
  const [loadingCust, setLoadingCust] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCust, setSelectedCust] = useState(null);
  const [type, setType] = useState('office_visit');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Fetch customers
    (async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, email, company')
          .order('name');
        if (!error && data) {
          setCustomers(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCust(false);
      }
    })();
  }, []);

  const filteredCusts = customers.filter(cust => {
    const q = search.toLowerCase();
    return (
      (cust.name || '').toLowerCase().includes(q) ||
      (cust.email || '').toLowerCase().includes(q) ||
      (cust.company || '').toLowerCase().includes(q)
    );
  });

  const startTime = settings?.booking_start_time || '09:00:00';
  const endTime = settings?.booking_end_time || '15:00:00';
  const duration = settings?.slot_duration_minutes || 60;

  const slots = [];
  const [startH] = startTime.split(':').map(Number);
  const [endH] = endTime.split(':').map(Number);
  const startMins = startH * 60;
  const endMins = endH * 60;
  for (let m = startMins; m < endMins; m += duration) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const label = `${h % 12 === 0 ? 12 : h % 12}:${String(min).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    const value = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
    slots.push({ value, label });
  }

  const handleSave = async () => {
    if (!selectedCust || !date || !time) return;
    setSubmitting(true);
    try {
      await onSubmit({
        customerId: selectedCust.id,
        customerName: selectedCust.name,
        appointmentType: type,
        requestedDate: date,
        requestedTime: time,
        notes,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}
    onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        style={{
          background: c.card, border: `1px solid ${c.border}`, borderRadius: 20,
          width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto',
          boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.5)' : '0 25px 60px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text, margin: 0 }}>Create Appointment</h3>
            <p style={{ fontSize: 12, color: c.subText, margin: '2px 0 0' }}>Manually schedule an appointment for a customer</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Customer Search & Select */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: c.text, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>1. Select Customer</label>
            {selectedCust ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyBetween: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, border: `1px solid ${c.border}`,
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
              }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--brand-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                  {selectedCust.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{selectedCust.name}</div>
                  <div style={{ fontSize: 11, color: c.subText }}>{selectedCust.email}</div>
                </div>
                <button type="button" onClick={() => setSelectedCust(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search customer by name..."
                    style={{
                      width: '100%', padding: '8px 10px 8px 32px', borderRadius: 9,
                      border: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                      color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ maxHeight: 130, overflowY: 'auto', border: `1px solid ${c.border}`, borderRadius: 10, padding: 4 }}>
                  {loadingCust ? (
                    <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: c.subText }}><Loader2 size={16} className="animate-spin" /></div>
                  ) : filteredCusts.length === 0 ? (
                    <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: c.subText }}>No customers found</div>
                  ) : (
                    filteredCusts.map(cust => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => setSelectedCust(cust)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                          borderRadius: 8, background: 'transparent', border: 'none', textAlign: 'left',
                          cursor: 'pointer', color: c.text, transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <User size={14} color={c.subText} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{cust.name}</div>
                          <div style={{ fontSize: 10, color: c.subText }}>{cust.email} {cust.company ? `· ${cust.company}` : ''}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Type picker */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: c.text, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>2. Appointment Type</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TYPE_OPTIONS.map(opt => {
                const Ic = opt.icon;
                const isSelected = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 10, border: isSelected ? `2px solid var(--brand-color)` : `1px solid ${c.border}`,
                      background: isSelected ? 'var(--brand-color-light)' : 'transparent',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    <Ic size={16} color={isSelected ? 'var(--brand-color)' : c.subText} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: c.subText }}>{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: c.text, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>3. Date</label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setDate(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 9,
                  border: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                  color: c.text, fontSize: 13, boxSizing: 'border-box', outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: c.text, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>4. Time Slot</label>
              <select
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 9,
                  border: `1px solid ${c.border}`, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                  color: c.text, fontSize: 13, boxSizing: 'border-box', outline: 'none'
                }}
              >
                <option value="">Select slot</option>
                {slots.map(slot => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: c.text, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Direct follow up appointment regarding renewal quote"
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: `1px solid ${c.border}`,
                background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                color: c.text, fontSize: 13, resize: 'vertical', fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px', borderRadius: 10,
              border: `1px solid ${c.border}`, background: 'transparent',
              color: c.text, fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedCust || !date || !time || submitting}
              style={{
                flex: 1, padding: '10px', borderRadius: 10,
                background: !selectedCust || !date || !time ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') : 'var(--brand-color)',
                border: 'none',
                color: !selectedCust || !date || !time ? c.subText : '#fff',
                fontWeight: 600, fontSize: 13,
                cursor: (!selectedCust || !date || !time || submitting) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Book Appointment
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Appointment Detail Card (admin view) ──────────────────────────────────────
function AdminAppointmentCard({ apt, onAccept, onRejectClick, onCounterPropose, onDeleteClick, settings, c, isDark, isHighlighted, onClearHighlight }) {
  const sc = getStatusColor(apt.status);
  const TypeIcon = TYPE_ICONS[apt.appointment_type] || Calendar;
  const { date: effDate, time: effTime } = getEffectiveDateTime(apt);

  const formattedDate = effDate
    ? new Date(`${effDate}T${effTime || '00:00:00'}`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'No date set';
  const formattedTime = effTime
    ? new Date(`2000-01-01T${effTime}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';

  const customerName = apt.customers?.name || 'Customer';
  const customerEmail = apt.customers?.email || '';
  const customerCompany = apt.customers?.company || '';

  const handleCardInteraction = () => {
    if (isHighlighted && onClearHighlight) {
      onClearHighlight();
    }
  };

  return (
    <div 
      className={isHighlighted ? 'highlighted-appointment-card' : ''}
      onClick={handleCardInteraction}
      onMouseEnter={handleCardInteraction}
      style={{
        background: c.card, border: isHighlighted ? `2px solid var(--brand-color)` : `1px solid ${c.border}`, borderRadius: 16,
        overflow: 'hidden', transition: 'all 0.3s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ padding: '20px' }}>
        {/* Top row */}
        <div className="admin-apt-card" style={{ display: 'flex', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            background: isDark ? 'rgba(232,123,53,0.12)' : 'rgba(232,123,53,0.09)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TypeIcon size={24} color="var(--brand-color)" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: c.text }}>
                {getAppointmentTypeLabel(apt.appointment_type)}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {getStatusLabel(apt.status)}
              </span>
            </div>

            {/* Customer info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: 'var(--brand-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 11, fontWeight: 700,
              }}>
                {customerName.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{customerName}</span>
                {customerCompany && <span style={{ fontSize: 12, color: c.subText }}> · {customerCompany}</span>}
                {customerEmail && <span style={{ fontSize: 11, color: c.subText, display: 'block', marginTop: 1 }}>{customerEmail}</span>}
              </div>
            </div>

            {/* Date/Time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: c.subText }}>
                <Calendar size={13} color="var(--brand-color)" />
                <span style={{ fontWeight: 500, color: c.text }}>{formattedDate}</span>
              </div>
              {formattedTime && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: c.subText }}>
                  <Clock size={13} color="var(--brand-color)" />
                  <span style={{ fontWeight: 500, color: c.text }}>{formattedTime}</span>
                </div>
              )}
            </div>
          </div>

          {/* Delete Button on top right */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDeleteClick(apt.id); }}
            style={{
              background: 'transparent', border: 'none', color: c.subText, cursor: 'pointer',
              padding: 8, borderRadius: 8, display: 'flex', flexShrink: 0,
              transition: 'all 0.2s',
            }}
            title="Delete Appointment"
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = c.subText; e.currentTarget.style.background = 'transparent'; }}
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Notes */}
        {apt.notes && (
          <div style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 10,
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            border: `1px solid ${c.border}`,
          }}>
            <div style={{ fontSize: 11, color: c.subText, marginBottom: 3, fontWeight: 600 }}>Customer Notes</div>
            <div style={{ fontSize: 13, color: c.text, lineHeight: 1.4 }}>{apt.notes}</div>
          </div>
        )}

        {apt.admin_notes && (
          <div style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 10,
            background: isDark ? 'rgba(232,123,53,0.07)' : 'rgba(232,123,53,0.05)',
            border: '1px solid rgba(232,123,53,0.2)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--brand-color)', marginBottom: 3, fontWeight: 600 }}>Admin Reason / Note</div>
            <div style={{ fontSize: 13, color: c.text, lineHeight: 1.4 }}>{apt.admin_notes}</div>
          </div>
        )}

        {/* Action buttons */}
        {apt.status === 'pending' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <button
              type="button"
              onClick={() => onAccept(apt.id, apt.customer_id)}
              style={{
                flex: 1, minWidth: 100, padding: '10px 14px', borderRadius: 10,
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                color: '#22c55e', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,197,94,0.1)'}
            >
              <Check size={14} /> Accept
            </button>
            <button
              type="button"
              onClick={() => onCounterPropose(apt)}
              style={{
                flex: 1, minWidth: 100, padding: '10px 14px', borderRadius: 10,
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                color: '#6366f1', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
            >
              <Edit2 size={14} /> Suggest Time
            </button>
            <button
              type="button"
              onClick={() => onRejectClick(apt.id, apt.customer_id)}
              style={{
                flex: 1, minWidth: 100, padding: '10px 14px', borderRadius: 10,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            >
              <X size={14} /> Reject
            </button>
          </div>
        )}

        {apt.status === 'counter_proposed' && (
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bell size={13} className="animate-bounce" /> Waiting for customer response
          </div>
        )}

        {apt.status === 'accepted' && (
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={13} /> Appointment confirmed
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stats cards ───────────────────────────────────────────────────────────────
function StatsRow({ appointments, c, isDark }) {
  const today = new Date().toISOString().split('T')[0];
  const pending = appointments.filter(a => a.status === 'pending').length;
  const todayApts = appointments.filter(a => {
    const { date } = getEffectiveDateTime(a);
    return date === today && a.status === 'accepted';
  }).length;
  const thisWeek = appointments.filter(a => {
    const { date } = getEffectiveDateTime(a);
    if (!date) return false;
    const d = new Date(date);
    const now = new Date();
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);
    return d >= startOfWeek && d <= endOfWeek;
  }).length;
  const completed = appointments.filter(a => a.status === 'completed').length;

  const cards = [
    { label: 'Pending Review', value: pending, color: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.1)' : '#fef3c7', icon: AlertCircle },
    { label: "Today's Confirmed", value: todayApts, color: 'var(--brand-color)', bg: isDark ? 'rgba(232,123,53,0.1)' : '#fff5ee', icon: Clock },
    { label: 'This Week', value: thisWeek, color: '#6366f1', bg: isDark ? 'rgba(99,102,241,0.1)' : '#e0e7ff', icon: Calendar },
    { label: 'Completed', value: completed, color: '#22c55e', bg: isDark ? 'rgba(34,197,94,0.1)' : '#dcfce7', icon: CheckCircle },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div key={card.label} style={{
            background: c.card, border: `1px solid ${c.border}`, borderRadius: 16,
            padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
          }}>
            <div>
              <div style={{ fontSize: 13, color: c.subText, fontWeight: 500, marginBottom: 4 }}>{card.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: c.text, lineHeight: 1 }}>{card.value}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={card.color} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminAppointmentsPage({ c, isDark, isMobile }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // list | calendar
  const [filter, setFilter] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [counterApt, setCounterApt] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [highlightedAptId, setHighlightedAptId] = useState(null);

  // Modals state
  const [deleteAptId, setDeleteAptId] = useState(null);
  const [rejectData, setRejectData] = useState(null); // { id, customerId }
  const [showCreate, setShowCreate] = useState(false);

  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      const apts = await getAllAppointments();
      setAppointments(apts);
      const cfg = await getAppointmentSettings();
      setSettings(cfg);
    } catch (e) {
      console.error('Failed to load appointments:', e);
      toast({ title: 'Error', description: `Failed to load appointments: ${e.message || e}`, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle highlighting from notifications
  useEffect(() => {
    const highlightId = sessionStorage.getItem('admin_highlight_appointment_id');
    if (highlightId) {
      setHighlightedAptId(highlightId);
      setFilter('all');
      setSelectedDate(null);
      sessionStorage.removeItem('admin_highlight_appointment_id');

      const timer = setTimeout(() => {
        setHighlightedAptId(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [appointments]);

  // Real-time Postgres changes listener
  useEffect(() => {
    const channel = supabase
      .channel('admin-appointments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleAccept = async (id, customerId) => {
    try {
      const apt = appointments.find(a => a.id === id);
      await updateAppointmentAdmin(id, {
        status: 'accepted',
        confirmed_date: apt.requested_date,
        confirmed_time: apt.requested_time,
      });

      await sendAppointmentNotification({
        customerId,
        type: `appointment_accepted:${id}`,
        title: '✓ Appointment Confirmed',
        message: `Your ${getAppointmentTypeLabel(apt.appointment_type)} on ${new Date(apt.requested_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${new Date(`2000-01-01T${apt.requested_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} has been confirmed.`,
      });
      toast({ title: '✓ Appointment accepted' });
      await loadData();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleRejectConfirm = async (reason) => {
    if (!rejectData) return;
    const { id, customerId } = rejectData;
    try {
      const apt = appointments.find(a => a.id === id);
      await updateAppointmentAdmin(id, {
        status: 'rejected',
        admin_notes: reason,
      });

      await sendAppointmentNotification({
        customerId,
        type: `appointment_rejected:${id}`,
        title: 'Appointment Declined',
        message: `Your ${getAppointmentTypeLabel(apt?.appointment_type || '')} appointment request has been declined. Reason: ${reason}`,
      });
      toast({ title: 'Appointment rejected successfully' });
      setRejectData(null);
      await loadData();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleCounterPropose = async ({ date, time, notes }) => {
    if (!counterApt) return;
    try {
      await updateAppointmentAdmin(counterApt.id, {
        status: 'counter_proposed',
        confirmed_date: date,
        confirmed_time: time,
        admin_notes: notes || 'Admin has suggested a new time. Please accept or decline.',
      });
      await sendAppointmentNotification({
        customerId: counterApt.customer_id,
        type: `appointment_counter_proposed:${counterApt.id}`,
        title: 'New Appointment Time Suggested',
        message: `Admin has suggested ${new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} for your ${getAppointmentTypeLabel(counterApt.appointment_type)} appointment. Please accept or decline.`,
      });
      toast({ title: '✓ Counter-proposal sent to customer' });
      setCounterApt(null);
      await loadData();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteAptId) return;
    try {
      await deleteAppointment(deleteAptId);
      toast({ title: 'Appointment deleted permanently' });
      setDeleteAptId(null);
      await loadData();
    } catch (e) {
      toast({ title: 'Error deleting appointment', description: e.message, variant: 'destructive' });
    }
  };

  const handleCreateAppointment = async ({ customerId, customerName, appointmentType, requestedDate, requestedTime, notes }) => {
    try {
      const apt = await createAppointmentAdmin({
        customerId,
        appointmentType,
        notes,
        requestedDate,
        requestedTime,
      });

      await sendAppointmentNotification({
        customerId,
        type: `appointment_created:${apt.id}`,
        title: 'Appointment Booked By Admin',
        message: `We have booked a ${getAppointmentTypeLabel(appointmentType)} appointment for you on ${new Date(requestedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${new Date(`2000-01-01T${requestedTime}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`,
      });

      toast({ title: '✓ Appointment Booked', description: `Successfully booked for ${customerName}` });
      setShowCreate(false);
      await loadData();
    } catch (e) {
      toast({ title: 'Error creating appointment', description: e.message, variant: 'destructive' });
    }
  };

  // Filtering
  const filtered = appointments.filter(apt => {
    if (filter !== 'all' && apt.status !== filter) return false;
    if (selectedDate) {
      const { date } = getEffectiveDateTime(apt);
      if (date !== selectedDate) return false;
    }
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      return (
        (apt.customers?.name || '').toLowerCase().includes(q) ||
        (apt.customers?.email || '').toLowerCase().includes(q) ||
        getAppointmentTypeLabel(apt.appointment_type).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const STATUS_FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'accepted', label: 'Confirmed' },
    // { id: 'counter_proposed', label: 'Counter Proposed' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'cancelled', label: 'Cancelled' },
    // { id: 'completed', label: 'Completed' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <Loader2 size={32} className="animate-spin" color="var(--brand-color)" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <style>{`
        @keyframes appointment-pulse {
          0% {
            box-shadow: 0 0 0 0px rgba(232, 123, 53, 0.4);
            background-color: rgba(232, 123, 53, 0.12) !important;
          }
          50% {
            box-shadow: 0 0 0 8px rgba(232, 123, 53, 0);
            background-color: rgba(232, 123, 53, 0.04) !important;
          }
          100% {
            box-shadow: 0 0 0 0px rgba(232, 123, 53, 0.4);
            background-color: rgba(232, 123, 53, 0.12) !important;
          }
        }
        .highlighted-appointment-card {
          animation: appointment-pulse 1.8s infinite ease-in-out;
          border-color: var(--brand-color) !important;
        }
        .admin-apt-card {
          display: flex;
          flex-direction: row;
        }
        @media (max-width: 640px) {
          .admin-apt-card {
            flex-direction: column !important;
          }
        }
      `}</style>

      {/* Stats */}
      <StatsRow appointments={appointments} c={c} isDark={isDark} />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Create appointment button */}
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          style={{
            padding: '9px 16px', borderRadius: 10,
            background: 'var(--brand-color)', border: 'none',
            color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 12px rgba(232,123,53,0.3)',
          }}
        >
          <Plus size={15} /> Create Appointment
        </button>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search by customer name..."
            style={{
              width: '100%', padding: '8px 10px 8px 32px', borderRadius: 10,
              border: `1px solid ${c.border}`,
              background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
              color: c.text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderRadius: 10, padding: 4 }}>
          {[
            { id: 'list', icon: Filter, label: 'List' },
            { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
          ].map(v => (
            <button key={v.id} type="button" onClick={() => setView(v.id)} style={{
              padding: '6px 12px', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 5,
              background: view === v.id ? (isDark ? 'rgba(255,255,255,0.1)' : '#fff') : 'transparent',
              border: 'none', color: view === v.id ? c.text : c.subText,
              fontWeight: view === v.id ? 600 : 400, fontSize: 13, cursor: 'pointer',
              boxShadow: view === v.id ? (isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.1)') : 'none',
            }}>
              <v.icon size={14} /> {v.label}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button type="button" onClick={loadData} style={{
          padding: '8px', borderRadius: 10, border: `1px solid ${c.border}`,
          background: 'transparent', color: c.subText, cursor: 'pointer', display: 'flex',
        }} title="Refresh">
          <RefreshCw size={14} />
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          style={{
            padding: '8px 14px', borderRadius: 10,
            border: `1px solid ${c.border}`,
            background: 'transparent',
            color: c.subText,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 500,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = c.text; e.currentTarget.style.borderColor = 'var(--brand-color)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = c.subText; e.currentTarget.style.borderColor = c.border; }}
          title="Appointment Settings"
        >
          <Settings size={14} /> Settings
        </button>
      </div>

      {/* Status filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {STATUS_FILTERS.map(sf => {
          const count = sf.id === 'all' ? appointments.length : appointments.filter(a => a.status === sf.id).length;
          const isActive = filter === sf.id;
          return (
            <button
              key={sf.id}
              type="button"
              onClick={() => { setFilter(sf.id); setSelectedDate(null); }}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: isActive ? 'var(--brand-color)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                border: isActive ? 'none' : `1px solid ${c.border}`,
                color: isActive ? '#fff' : c.subText,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {sf.label}
              {count > 0 && <span style={{ opacity: isActive ? 0.8 : 0.6 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {view === 'calendar' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 20 }} className="cal-main-grid">
          <style>{`@media (min-width: 768px) { .cal-main-grid { grid-template-columns: 1fr 380px !important; } }`}</style>

          <div>
            {/* Filtered appointments for selected date */}
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: 0 }}>
                {selectedDate
                  ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                  : 'All Appointments'}
              </h3>
              {selectedDate && (
                <button type="button" onClick={() => setSelectedDate(null)} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <X size={12} /> Clear
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: c.subText, fontSize: 14 }}>
                {selectedDate ? 'No appointments on this day' : 'No appointments match your filter'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.map(apt => (
                  <AdminAppointmentCard
                    key={apt.id} apt={apt}
                    onAccept={handleAccept}
                    onRejectClick={(id, customerId) => setRejectData({ id, customerId })}
                    onCounterPropose={setCounterApt}
                    onDeleteClick={setDeleteAptId}
                    settings={settings}
                    c={c} isDark={isDark}
                    isHighlighted={apt.id === highlightedAptId}
                    onClearHighlight={() => setHighlightedAptId(null)}
                  />
                ))}
              </div>
            )}
          </div>

          <CalendarView
            appointments={appointments}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            c={c} isDark={isDark}
          />
        </div>
      ) : (
        <div style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: 48, textAlign: 'center', borderRadius: 16,
              border: `2px dashed ${c.border}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            }}>
              <CalendarDays size={40} color={c.subText} style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 6 }}>No appointments found</div>
              <div style={{ fontSize: 13, color: c.subText }}>Appointments from customers will appear here</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(apt => (
                <AdminAppointmentCard
                  key={apt.id} apt={apt}
                  onAccept={handleAccept}
                  onRejectClick={(id, customerId) => setRejectData({ id, customerId })}
                  onCounterPropose={setCounterApt}
                  onDeleteClick={setDeleteAptId}
                  settings={settings}
                  c={c} isDark={isDark}
                  isHighlighted={apt.id === highlightedAptId}
                  onClearHighlight={() => setHighlightedAptId(null)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Counter propose modal */}
      <AnimatePresence>
        {counterApt && (
          <CounterProposeModal
            appointment={counterApt}
            onClose={() => setCounterApt(null)}
            onSubmit={handleCounterPropose}
            settings={settings}
            c={c} isDark={isDark}
          />
        )}
      </AnimatePresence>

      {/* Settings modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(6px)',
              zIndex: 200,
              display: 'flex', justifyContent: 'flex-end',
            }}
            onClick={e => e.target === e.currentTarget && setShowSettings(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              style={{
                width: '100%',
                maxWidth: 560,
                height: '100%',
                background: isDark ? '#15161A' : '#f8f8f7',
                borderLeft: `1px solid ${c.border}`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: isDark
                  ? '-20px 0 60px rgba(0,0,0,0.5)'
                  : '-20px 0 60px rgba(0,0,0,0.12)',
              }}
            >
              {/* Panel header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: `1px solid ${c.border}`,
                background: isDark ? '#1C1E24' : '#fff',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: 'rgba(232,123,53,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Settings size={17} color="var(--brand-color)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Appointment Settings</div>
                    <div style={{ fontSize: 12, color: c.subText }}>Configure booking hours & reminders</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                    border: 'none', borderRadius: 8, padding: 8,
                    color: c.subText, cursor: 'pointer', display: 'flex',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = c.text; }}
                  onMouseLeave={e => { e.currentTarget.style.color = c.subText; }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <AppointmentSettingsSection
                  c={c}
                  isDark={isDark}
                  onSaved={() => {
                    loadData();
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Reason Modal */}
      <AnimatePresence>
        {rejectData && (
          <RejectReasonModal
            onClose={() => setRejectData(null)}
            onSubmit={handleRejectConfirm}
            c={c}
            isDark={isDark}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteAptId && (
          <DeleteConfirmationModal
            onClose={() => setDeleteAptId(null)}
            onSubmit={handleDeleteConfirm}
            c={c}
            isDark={isDark}
          />
        )}
      </AnimatePresence>

      {/* Create Appointment Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateAppointmentModal
            onClose={() => setShowCreate(false)}
            onSubmit={handleCreateAppointment}
            settings={settings}
            c={c}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
