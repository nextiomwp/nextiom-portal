import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar, Clock, Plus, ChevronLeft, ChevronRight, X, CheckCircle,
  Video, Phone, Building2, FileText, AlertTriangle, Loader2, Bell,
  ChevronDown, Info, XCircle, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAppointmentSettings,
  createAppointment,
  getCustomerAppointments,
  updateAppointmentCustomer,
  getAppointmentTypeLabel,
  getStatusColor,
  getStatusLabel,
  formatAppointmentDate,
  getEffectiveDateTime,
  sendAdminAppointmentNotification,
} from '@/lib/appointments';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

// ── Type icons ────────────────────────────────────────────────────────────────
const TYPE_ICONS = {
  office_visit: Building2,
  zoom_meeting: Video,
  phone_call: Phone,
};

const TYPE_OPTIONS = [
  { value: 'office_visit', label: 'Office Visit', desc: 'Visit us in person at our office', icon: Building2, color: '#E87B35' },
  { value: 'zoom_meeting', label: 'Zoom Meeting', desc: 'Join a video call with our team', icon: Video, color: '#2563eb' },
  { value: 'phone_call', label: 'Phone Call', desc: 'We\'ll call you at your registered number', icon: Phone, color: '#16a34a' },
];

// ── Tiny calendar ─────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function MiniCalendar({ selectedDate, onSelectDate, appointments, settings, c, isDark }) {
  const [viewYear, setViewYear] = useState(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    return d.getMonth();
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allowedDays = settings?.allowed_days || [1, 2, 3, 4, 5];
  const startTime = settings?.booking_start_time || '09:00:00';
  const endTime = settings?.booking_end_time || '15:00:00';

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Build appointment map keyed by date string
  const aptMap = {};
  (appointments || []).forEach(apt => {
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
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${c.border}` }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 14, color: c.text }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 12px 0' }}>
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: c.subText, padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '4px 12px 12px', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const cellDate = new Date(dateStr);
          cellDate.setHours(0, 0, 0, 0);
          const isToday = cellDate.getTime() === today.getTime();
          const isSelected = selectedDate === dateStr;
          const isPast = cellDate < today;
          const dayOfWeek = cellDate.getDay();
          const isAllowed = allowedDays.includes(dayOfWeek);
          const apts = aptMap[dateStr] || [];
          const hasApt = apts.length > 0;

          // Status-based dot colors for appointments
          const aptColors = apts.map(a => {
            const sc = getStatusColor(a.status);
            return sc.text;
          });

          return (
            <button
              key={dateStr}
              onClick={() => isAllowed && !isPast ? onSelectDate(dateStr) : null}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1',
                borderRadius: 8,
                border: isSelected ? `2px solid var(--brand-color)` : isToday ? `2px solid ${c.border}` : '2px solid transparent',
                background: isSelected ? 'var(--brand-color)' : isToday ? (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)') : 'transparent',
                color: isSelected ? '#fff' : isPast ? c.subText : !isAllowed ? c.subText : c.text,
                cursor: isAllowed && !isPast ? 'pointer' : 'default',
                opacity: (!isAllowed || isPast) ? 0.35 : 1,
                fontSize: 13,
                fontWeight: isToday || isSelected ? 700 : 400,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                transition: 'all 0.15s',
              }}
            >
              {day}
              {hasApt && (
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  {aptColors.slice(0, 3).map((col, ci) => (
                    <span key={ci} style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#fff' : col }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ padding: '8px 20px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', borderTop: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: c.subText }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          Confirmed
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: c.subText }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
          Pending
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: c.subText }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
          Counter Proposed
        </div>
      </div>
    </div>
  );
}

// ── Time slot picker ──────────────────────────────────────────────────────────
function TimeSlotPicker({ selectedTime, onSelect, settings, c }) {
  const startTime = settings?.booking_start_time || '09:00:00';
  const endTime = settings?.booking_end_time || '15:00:00';
  const duration = settings?.slot_duration_minutes || 60;

  const slots = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  for (let m = startMins; m < endMins; m += duration) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const label = `${h % 12 === 0 ? 12 : h % 12}:${String(min).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    const value = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
    slots.push({ value, label });
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
      {slots.map(slot => (
        <button
          key={slot.value}
          onClick={() => onSelect(slot.value)}
          style={{
            padding: '8px 4px',
            borderRadius: 8,
            border: selectedTime === slot.value ? `2px solid var(--brand-color)` : `1px solid ${c.border}`,
            background: selectedTime === slot.value ? 'var(--brand-color-light)' : 'transparent',
            color: selectedTime === slot.value ? 'var(--brand-color)' : c.text,
            fontSize: 12,
            fontWeight: selectedTime === slot.value ? 700 : 400,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {slot.label}
        </button>
      ))}
      {slots.length === 0 && (
        <div style={{ color: c.subText, fontSize: 13, gridColumn: '1/-1', textAlign: 'center', padding: 8 }}>
          No slots available for this configuration.
        </div>
      )}
    </div>
  );
}

// ── Appointment card ──────────────────────────────────────────────────────────
function AppointmentCard({ apt, onCancel, onAcceptCounter, onRejectCounter, c, isDark, isHighlighted, onClearHighlight }) {
  const sc = getStatusColor(apt.status);
  const TypeIcon = TYPE_ICONS[apt.appointment_type] || Calendar;
  const { date: effDate, time: effTime } = getEffectiveDateTime(apt);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (isHighlighted) {
      setExpanded(true);
    }
  }, [isHighlighted]);

  const handleCardClick = () => {
    setExpanded(v => !v);
    if (isHighlighted && onClearHighlight) {
      onClearHighlight();
    }
  };

  const formattedDate = effDate
    ? new Date(`${effDate}T${effTime || '00:00:00'}`).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      })
    : '';
  const formattedTime = effTime
    ? new Date(`2000-01-01T${effTime}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div 
      className={isHighlighted ? 'highlighted-appointment-card' : ''}
      style={{
        background: c.card,
        border: isHighlighted ? `2px solid var(--brand-color)` : `1px solid ${c.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}>
      <div
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
        onClick={handleCardClick}
      >
        {/* Type icon */}
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: isDark ? 'rgba(232,123,53,0.1)' : 'rgba(232,123,53,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TypeIcon size={20} color="var(--brand-color)" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: c.text }}>
              {getAppointmentTypeLabel(apt.appointment_type)}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
              background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
            }}>
              {getStatusLabel(apt.status)}
            </span>
          </div>
          {formattedDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: c.subText }}>
              <Calendar size={11} />
              <span>{formattedDate}</span>
              {formattedTime && <><Clock size={11} /><span>{formattedTime}</span></>}
            </div>
          )}
        </div>

        <ChevronDown size={16} color={c.subText} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${c.border}` }}>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Original requested time (if different) */}
                {(apt.status === 'counter_proposed' || apt.status === 'accepted') && apt.requested_date !== apt.confirmed_date && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: 11, color: c.subText, marginBottom: 2 }}>Originally requested</div>
                    <div style={{ fontSize: 13, color: c.text }}>
                      {new Date(`${apt.requested_date}T${apt.requested_time || '00:00:00'}`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      {' at '}
                      {new Date(`2000-01-01T${apt.requested_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}

                {apt.notes && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: 11, color: c.subText, marginBottom: 2 }}>Your notes</div>
                    <div style={{ fontSize: 13, color: c.text }}>{apt.notes}</div>
                  </div>
                )}

                {apt.admin_notes && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div style={{ fontSize: 11, color: '#6366f1', marginBottom: 2 }}>Admin note</div>
                    <div style={{ fontSize: 13, color: c.text }}>{apt.admin_notes}</div>
                  </div>
                )}

                {/* Counter-proposal action buttons */}
                {apt.status === 'counter_proposed' && !apt.customer_response && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      onClick={() => onAcceptCounter(apt.id)}
                      style={{
                        flex: 1, padding: '9px 16px', borderRadius: 8,
                        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                        color: '#22c55e', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <Check size={14} /> Accept New Time
                    </button>
                    <button
                      onClick={() => onRejectCounter(apt.id)}
                      style={{
                        flex: 1, padding: '9px 16px', borderRadius: 8,
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        color: '#ef4444', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <X size={14} /> Decline
                    </button>
                  </div>
                )}

                {/* Cancel button */}
                {(apt.status === 'pending') && (
                  <button
                    onClick={() => onCancel(apt.id)}
                    style={{
                      padding: '8px 14px', borderRadius: 8, width: 'fit-content',
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                      color: '#ef4444', fontWeight: 500, fontSize: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <X size={12} /> Cancel Appointment
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Booking Modal ─────────────────────────────────────────────────────────────
function BookingModal({ onClose, onSubmit, settings, c, isDark }) {
  const [step, setStep] = useState(1); // 1: type, 2: date, 3: time, 4: notes
  const [selectedType, setSelectedType] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [appointments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const allowedDays = settings?.allowed_days || [1, 2, 3, 4, 5];
  const today = new Date().toISOString().split('T')[0];

  const canProceed = () => {
    if (step === 1) return !!selectedType;
    if (step === 2) return !!selectedDate;
    if (step === 3) return !!selectedTime;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({ appointmentType: selectedType, requestedDate: selectedDate, requestedTime: selectedTime, notes });
      onClose();
    } catch (e) {
      // error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = ['Type', 'Date', 'Time', 'Notes'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        style={{
          background: c.card, border: `1px solid ${c.border}`, borderRadius: 20,
          width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: isDark ? '0 25px 60px rgba(0,0,0,0.5)' : '0 25px 60px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: c.text, margin: 0 }}>Book Appointment</h2>
            <p style={{ fontSize: 13, color: c.subText, margin: '4px 0 0' }}>Step {step} of 4: {stepLabels[step - 1]}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: c.subText, cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4].map(s => (
              <div key={s} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: s <= step ? 'var(--brand-color)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p style={{ fontSize: 13, color: c.subText, marginBottom: 16 }}>Choose how you'd like to meet with us:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {TYPE_OPTIONS.map(opt => {
                    const Ic = opt.icon;
                    const isSelected = selectedType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedType(opt.value)}
                        style={{
                          padding: '16px 18px', borderRadius: 12,
                          border: isSelected ? `2px solid var(--brand-color)` : `1px solid ${c.border}`,
                          background: isSelected ? 'var(--brand-color-light)' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                          cursor: 'pointer', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 14,
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${opt.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Ic size={20} color={opt.color} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{opt.label}</div>
                          <div style={{ fontSize: 12, color: c.subText, marginTop: 2 }}>{opt.desc}</div>
                        </div>
                        {isSelected && <CheckCircle size={18} color="var(--brand-color)" style={{ marginLeft: 'auto' }} />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p style={{ fontSize: 13, color: c.subText, marginBottom: 16 }}>Select a date (weekdays only, highlighted in white):</p>
                <MiniCalendar
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  appointments={appointments}
                  settings={settings}
                  c={c}
                  isDark={isDark}
                />
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: isDark ? 'rgba(232,123,53,0.07)' : 'rgba(232,123,53,0.06)', border: '1px solid rgba(232,123,53,0.2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--brand-color)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Info size={12} />
                    Bookings available {settings?.booking_start_time?.slice(0,5) || '09:00'} – {settings?.booking_end_time?.slice(0,5) || '15:00'}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p style={{ fontSize: 13, color: c.subText, marginBottom: 16 }}>
                  Choose your preferred time on{' '}
                  <strong style={{ color: c.text }}>
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </strong>:
                </p>
                <TimeSlotPicker
                  selectedTime={selectedTime}
                  onSelect={setSelectedTime}
                  settings={settings}
                  c={c}
                />
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p style={{ fontSize: 13, color: c.subText, marginBottom: 16 }}>Optionally add any notes or details about your appointment:</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. I'd like to discuss my hosting plan renewal, website migration, etc."
                  rows={5}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10,
                    border: `1px solid ${c.border}`,
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    color: c.text, fontSize: 13, resize: 'vertical',
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  }}
                />

                {/* Summary */}
                <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: isDark ? 'rgba(232,123,53,0.07)' : 'rgba(232,123,53,0.06)', border: '1px solid rgba(232,123,53,0.2)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-color)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Booking Summary</div>
                  {[
                    { label: 'Type', value: getAppointmentTypeLabel(selectedType) },
                    { label: 'Date', value: new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) },
                    { label: 'Time', value: new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: c.subText }}>{r.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${c.border}`, display: 'flex', gap: 10 }}>
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 10,
                border: `1px solid ${c.border}`, background: 'transparent',
                color: c.text, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <ChevronLeft size={16} /> Back
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 10,
                background: canProceed() ? 'var(--brand-color)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
                border: 'none', color: canProceed() ? '#fff' : c.subText,
                fontWeight: 600, fontSize: 14, cursor: canProceed() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 10,
                background: 'var(--brand-color)', border: 'none',
                color: '#fff', fontWeight: 600, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {submitting ? 'Booking...' : 'Confirm Booking'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CustomerAppointmentsPage({ user, isDark, c }) {
  const [appointments, setAppointments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedCalDate, setSelectedCalDate] = useState(null);
  const [view, setView] = useState('upcoming'); // upcoming | all | calendar
  const [highlightedAptId, setHighlightedAptId] = useState(null);
  const { toast } = useToast();

  const customerId = user?.id;

  const loadData = useCallback(async () => {
    if (!customerId) return;
    try {
      const [apts, cfg] = await Promise.all([
        getCustomerAppointments(customerId),
        getAppointmentSettings(),
      ]);
      setAppointments(apts);
      setSettings(cfg);
    } catch (e) {
      console.error('Failed to load appointments:', e);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle highlighting from notifications
  useEffect(() => {
    const highlightId = sessionStorage.getItem('highlight_appointment_id');
    if (highlightId) {
      setHighlightedAptId(highlightId);
      setView('all');
      sessionStorage.removeItem('highlight_appointment_id');
      
      const timer = setTimeout(() => {
        setHighlightedAptId(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [appointments]);

  // Real-time updates
  useEffect(() => {
    if (!customerId) return;
    const channel = supabase
      .channel('customer-appointments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, loadData]);

  const handleBook = async ({ appointmentType, requestedDate, requestedTime, notes }) => {
    try {
      const apt = await createAppointment({
        customerId,
        appointmentType,
        notes,
        requestedDate,
        requestedTime,
      });

      // Send notification to admin
      await sendAdminAppointmentNotification({
        type: 'appointment_request',
        title: `New Appointment Request`,
        message: `${user?.name || 'Customer'} has requested a ${getAppointmentTypeLabel(appointmentType)} on ${new Date(requestedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${new Date(`2000-01-01T${requestedTime}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`,
      });

      toast({ title: '✓ Appointment Requested', description: 'We\'ll confirm your appointment shortly.' });
      await loadData();
    } catch (e) {
      toast({ title: 'Error', description: e.message || 'Failed to book appointment', variant: 'destructive' });
      throw e;
    }
  };

  const handleCancel = async (id) => {
    try {
      await updateAppointmentCustomer(id, { status: 'cancelled' });
      toast({ title: 'Appointment cancelled' });
      await loadData();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleAcceptCounter = async (id) => {
    try {
      await updateAppointmentCustomer(id, { status: 'accepted', customer_response: 'accepted' });
      toast({ title: '✓ New time accepted!', description: 'Your appointment is now confirmed.' });
      await loadData();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleRejectCounter = async (id) => {
    try {
      await updateAppointmentCustomer(id, { status: 'cancelled', customer_response: 'rejected' });
      toast({ title: 'Counter-proposal declined', description: 'You may book a new appointment.' });
      await loadData();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // Filter appointments
  const now = new Date();
  const upcoming = appointments.filter(a => {
    const { date } = getEffectiveDateTime(a);
    if (!date) return a.status === 'pending' || a.status === 'counter_proposed';
    return new Date(date) >= new Date(now.toISOString().split('T')[0]) && !['cancelled', 'rejected', 'completed'].includes(a.status);
  });

  const calendarApts = selectedCalDate
    ? appointments.filter(a => {
        const { date } = getEffectiveDateTime(a);
        return date === selectedCalDate;
      })
    : [];

  const pendingCounter = appointments.filter(a => a.status === 'counter_proposed' && !a.customer_response);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <Loader2 size={32} className="animate-spin" color="var(--brand-color)" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0' }}>
      {/* Action required banner for counter-proposals */}
      {pendingCounter.length > 0 && (
        <div style={{
          marginBottom: 20, padding: '14px 20px', borderRadius: 12,
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Bell size={18} color="#6366f1" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#6366f1' }}>Action Required</div>
            <div style={{ fontSize: 12, color: c.subText }}>
              Admin has suggested a new time for {pendingCounter.length} appointment{pendingCounter.length > 1 ? 's' : ''}. Please accept or decline below.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 20 }} className="apt-grid">
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
        @media (min-width: 768px) {
          .apt-grid { grid-template-columns: 1fr 340px !important; }
        }
      `}</style>

        {/* Left: Appointments list */}
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: c.text, margin: 0 }}>My Appointments</h2>
              <p style={{ fontSize: 13, color: c.subText, margin: '4px 0 0' }}>
                {appointments.length} total · {upcoming.length} upcoming
              </p>
            </div>
            <button
              onClick={() => setShowBooking(true)}
              style={{
                padding: '10px 18px', borderRadius: 10,
                background: 'var(--brand-color)', border: 'none',
                color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(232,123,53,0.35)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(232,123,53,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(232,123,53,0.35)'; }}
            >
              <Plus size={16} /> Book Appointment
            </button>
          </div>

          {/* View tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 4 }}>
            {[
              { id: 'upcoming', label: `Upcoming (${upcoming.length})` },
              { id: 'all', label: `All (${appointments.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                style={{
                  flex: 1, padding: '7px 12px', borderRadius: 7,
                  background: view === tab.id ? (isDark ? 'rgba(255,255,255,0.1)' : '#fff') : 'transparent',
                  border: 'none', color: view === tab.id ? c.text : c.subText,
                  fontWeight: view === tab.id ? 600 : 400, fontSize: 13, cursor: 'pointer',
                  boxShadow: view === tab.id ? (isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.1)') : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Appointments */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(view === 'upcoming' ? upcoming : appointments).length === 0 ? (
              <div style={{
                padding: 40, textAlign: 'center', borderRadius: 16,
                border: `2px dashed ${c.border}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              }}>
                <Calendar size={40} color={c.subText} style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 6 }}>No appointments yet</div>
                <div style={{ fontSize: 13, color: c.subText, marginBottom: 20 }}>Book your first appointment with our team</div>
                <button
                  onClick={() => setShowBooking(true)}
                  style={{
                    padding: '10px 20px', borderRadius: 10,
                    background: 'var(--brand-color)', border: 'none',
                    color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Book Now
                </button>
              </div>
            ) : (
              (view === 'upcoming' ? upcoming : appointments).map(apt => (
                <AppointmentCard
                  key={apt.id}
                  apt={apt}
                  onCancel={handleCancel}
                  onAcceptCounter={handleAcceptCounter}
                  onRejectCounter={handleRejectCounter}
                  c={c}
                  isDark={isDark}
                  isHighlighted={apt.id === highlightedAptId}
                  onClearHighlight={() => setHighlightedAptId(null)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: Calendar */}
        <div>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: c.text, margin: '0 0 4px' }}>Appointment Calendar</h3>
            <p style={{ fontSize: 12, color: c.subText, margin: 0 }}>Click a date to see appointments</p>
          </div>
          <MiniCalendar
            selectedDate={selectedCalDate}
            onSelectDate={d => setSelectedCalDate(prev => prev === d ? null : d)}
            appointments={appointments}
            settings={settings}
            c={c}
            isDark={isDark}
          />

          {/* Selected date panel */}
          {selectedCalDate && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: 12 }}
            >
              <div style={{
                background: c.card, border: `1px solid ${c.border}`,
                borderRadius: 14, padding: 16,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 10 }}>
                  {new Date(selectedCalDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                {calendarApts.length === 0 ? (
                  <div style={{ fontSize: 12, color: c.subText, textAlign: 'center', padding: '12px 0' }}>
                    No appointments this day
                  </div>
                ) : (
                  calendarApts.map(apt => {
                    const sc = getStatusColor(apt.status);
                    const { time } = getEffectiveDateTime(apt);
                    const TypeIcon = TYPE_ICONS[apt.appointment_type] || Calendar;
                    return (
                      <div key={apt.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                        borderBottom: `1px solid ${c.border}`,
                      }}>
                        <TypeIcon size={14} color={sc.text} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{getAppointmentTypeLabel(apt.appointment_type)}</div>
                          <div style={{ fontSize: 11, color: c.subText }}>
                            {time ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: sc.bg, color: sc.text }}>
                          {getStatusLabel(apt.status)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* Booking hours info */}
          <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${c.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.text, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={12} color="var(--brand-color)" /> Booking Hours
            </div>
            <div style={{ fontSize: 12, color: c.subText }}>
              {settings?.booking_start_time?.slice(0, 5) || '09:00'} – {settings?.booking_end_time?.slice(0, 5) || '15:00'}
            </div>
            <div style={{ fontSize: 11, color: c.subText, marginTop: 4 }}>
              Weekdays only
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {showBooking && (
          <BookingModal
            onClose={() => setShowBooking(false)}
            onSubmit={handleBook}
            settings={settings}
            c={c}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
