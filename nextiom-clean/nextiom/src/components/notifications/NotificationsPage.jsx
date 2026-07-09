import React, { useState, useEffect } from 'react';
import { Loader2, Bell, AlertCircle, Info, ShoppingBag, Mail, CheckCircle, ChevronDown, ChevronUp, Globe, Server, Briefcase } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { markAsRead, getCustomerDomainRequests, getCustomerHostingRequests } from '@/lib/storage';

const getInvoiceNoFromTitle = (title) => {
  if (!title) return null;
  const match = title.match(/(?:Payment Submitted|Payment Info Updated|Invoice Refunded|Invoice Partially Refunded|Payment Approved|Payment Approved \(Installment\)|Payment Rejected|Info Requested):\s*([A-Za-z0-9-]+)/i);
  if (match) return match[1];
  const genMatch = title.match(/(INV-[A-Za-z0-9-]+)/i);
  return genMatch ? genMatch[1] : null;
};

function getIconData(type, isDark) {
  switch (String(type || '').toLowerCase()) {
    case 'job':
    case 'job_update':
      return { Icon: Briefcase, color: 'var(--brand-color)', bg: isDark ? 'var(--brand-color-light)' : 'var(--brand-color-light)' };
    case 'expiration':
      return { Icon: AlertCircle, color: '#ef4444', bg: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2' };
    case 'new_product':
      return { Icon: ShoppingBag, color: '#16a34a', bg: isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7' };
    case 'update':
      return { Icon: Info, color: '#2563eb', bg: isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe' };
    case 'domain_request':
      return { Icon: Globe, color: '#7c3aed', bg: isDark ? 'rgba(124,58,237,0.15)' : '#ede9fe' };
    case 'hosting_request':
      return { Icon: Server, color: '#0891b2', bg: isDark ? 'rgba(8,145,178,0.15)' : '#cffafe' };
    case 'email_request':
      return { Icon: Mail, color: 'var(--brand-color)', bg: isDark ? 'var(--brand-color-light)' : 'var(--brand-color-light)' };
    default:
      return { Icon: Mail, color: '#64748b', bg: isDark ? 'rgba(100,116,139,0.15)' : '#f1f5f9' };
  }
}

function TypeBadge({ type, isDark }) {
  const { color, bg } = getIconData(type, isDark);
  const label = type ? type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'General';
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: bg, color }}>
      {label}
    </span>
  );
}

function NotificationsPage({ customerId, onNavigate, isDark = false, c = {} }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const card = c.card || '#fff';
  const border = c.border || '#ebebeb';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const hover = c.hover || '#f5f5f5';
  const brand = c.brand || 'var(--brand-color)';
  const panel2 = c.panel2 || '#f5f5f5';
  const brandLight = c.brandLight || 'var(--brand-color-light)';

  useEffect(() => {
    if (!customerId) { setIsLoading(false); return; }

    const load = async () => {
      setIsLoading(true);
      try {
        const [dbRes, domainReqs, hostingReqs, customerRes] = await Promise.all([
          supabase
            .from('notifications')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false }),
          getCustomerDomainRequests(customerId).catch(() => []),
          getCustomerHostingRequests(customerId).catch(() => []),
          supabase
            .from('customers')
            .select('notifications_cleared_at')
            .eq('id', customerId)
            .maybeSingle(),
        ]);

        const clearedAt = customerRes?.data?.notifications_cleared_at;
        const clearedTime = clearedAt ? new Date(clearedAt).getTime() : 0;

        let dbNotifications = (dbRes.data || []).filter(n => n.type !== 'customer_login');
        if (clearedTime > 0) {
          dbNotifications = dbNotifications.filter(n => !n.created_at || new Date(n.created_at).getTime() > clearedTime);
        }

        const existingTitles = new Set(dbNotifications.map(n => n.title));
        const virtualNotifs = [];

        (domainReqs || []).forEach(r => {
          const st = String(r.status || '').toLowerCase();
          if (['approved', 'completed', 'rejected'].includes(st)) {
            const timestamp = r.updated_at || r.created_at;
            if (clearedTime > 0 && timestamp && new Date(timestamp).getTime() <= clearedTime) {
              return;
            }
            const title = st === 'rejected'
              ? `Domain Request Rejected — ${r.domain_name}`
              : `Domain Request Approved — ${r.domain_name}`;
            if (!existingTitles.has(title)) {
              virtualNotifs.push({
                id: `virt-domain-${r.id}`,
                title,
                message: st === 'rejected'
                  ? `Your domain registration request for "${r.domain_name}" has been declined. Please contact support for more information.`
                  : `Your domain registration request for "${r.domain_name}" has been approved and is now being processed.`,
                type: st === 'rejected' ? 'expiration' : 'domain_request',
                read_status: false,
                created_at: timestamp,
                virtual: true,
              });
            }
          }
        });

        (hostingReqs || []).forEach(r => {
          const st = String(r.status || '').toLowerCase();
          if (['approved', 'completed', 'rejected'].includes(st)) {
            const planName = r.package_type?.split('|')[0]?.trim() || 'Hosting';
            const timestamp = r.updated_at || r.created_at;
            if (clearedTime > 0 && timestamp && new Date(timestamp).getTime() <= clearedTime) {
              return;
            }
            const title = st === 'rejected'
              ? `Hosting Request Rejected — ${planName}`
              : `Hosting Request Approved — ${planName}`;
            if (!existingTitles.has(title)) {
              virtualNotifs.push({
                id: `virt-hosting-${r.id}`,
                title,
                message: st === 'rejected'
                  ? `Your hosting request for "${planName}" has been declined. Please contact support for more information.`
                  : `Your hosting request for "${planName}" has been approved and is being set up.`,
                type: st === 'rejected' ? 'expiration' : 'hosting_request',
                read_status: false,
                created_at: timestamp,
                virtual: true,
              });
            }
          }
        });

        const combined = [...dbNotifications, ...virtualNotifs].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );

        setNotifications(combined);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [customerId]);

  const handleRead = async (e, n) => {
    e.stopPropagation();
    if (n.virtual) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read_status: true } : x));
      return;
    }
    await markAsRead(n.id);
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read_status: true } : x));
  };

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  const unreadCount = notifications.filter(n => !n.read_status).length;

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: brand }} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: text }}>Notifications</h1>
          <p className="text-sm mt-0.5" style={{ color: subText }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ backgroundColor: c.brandLight, color: brand }}
          >
            {unreadCount} New
          </span>
        )}
      </div>

      {/* List */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: card, border: `1px solid ${border}` }}
      >
        {notifications.length > 0 ? (
          <div>
            {notifications.map((n, idx) => {
              const { Icon, color, bg } = getIconData(n.type, isDark);
              const isExpanded = expandedId === n.id;
              const isRead = n.read_status;

              return (
                <div
                  key={n.id}
                  style={{
                    borderBottom: idx < notifications.length - 1 ? `1px solid ${border}` : 'none',
                    backgroundColor: !isRead
                      ? (isDark ? 'rgba(232,123,53,0.05)' : 'rgba(232,123,53,0.03)')
                      : 'transparent',
                  }}
                >
                  {/* Row */}
                  <div
                    className="px-5 py-4 flex items-start gap-4 cursor-pointer transition-colors"
                    onClick={() => toggleExpand(n.id)}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = hover}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Icon */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: bg }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className="text-sm font-semibold"
                            style={{ color: !isRead ? text : subText }}
                          >
                            {n.title}
                          </p>
                          {!isRead && (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: brand }}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs" style={{ color: subText }}>
                            {n.created_at ? new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                          </span>
                          {isExpanded
                            ? <ChevronUp className="w-3.5 h-3.5" style={{ color: subText }} />
                            : <ChevronDown className="w-3.5 h-3.5" style={{ color: subText }} />}
                        </div>
                      </div>
                      {!isExpanded && (
                        <p className="text-xs mt-1 line-clamp-1" style={{ color: subText }}>
                          {n.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div
                      className="px-5 pb-4 ml-13"
                      style={{ paddingLeft: '4.25rem' }}
                    >
                      <div
                        className="rounded-lg p-4 space-y-3"
                        style={{ background: panel2, border: `1px solid ${border}` }}
                      >
                        <p className="text-sm leading-relaxed" style={{ color: text }}>
                          {n.message}
                        </p>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <TypeBadge type={n.type} isDark={isDark} />
                            <span className="text-xs" style={{ color: subText }}>
                              {n.created_at ? new Date(n.created_at).toLocaleString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              }) : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isRead && (
                              <button
                                onClick={e => handleRead(e, n)}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                style={{ color: brand, backgroundColor: brandLight }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Mark as Read
                              </button>
                            )}
                            {isRead && (
                              <span className="flex items-center gap-1 text-xs" style={{ color: '#16a34a' }}>
                                <CheckCircle className="w-3.5 h-3.5" />
                                Read
                              </span>
                            )}
                            {(n.type === 'quotation' || String(n.title || '').toLowerCase().includes('quotation')) && onNavigate && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!isRead) {
                                    await handleRead(e, n);
                                  }
                                  onNavigate('quotations');
                                }}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                style={{ color: '#fff', backgroundColor: brand }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                              >
                                Go to Quotations
                              </button>
                            )}
                            {(n.type === 'job' || n.type === 'job_update' || String(n.title || '').toLowerCase().includes('information required')) && onNavigate && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!isRead) {
                                    await handleRead(e, n);
                                  }
                                  const jobTitle = n.title.includes('—') ? n.title.split('—')[1].trim() : '';
                                  if (jobTitle) {
                                    sessionStorage.setItem('auto_select_job_title', jobTitle);
                                  }
                                  sessionStorage.setItem('scroll_to_checklist', 'true');
                                  onNavigate('jobs');
                                }}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                style={{ color: '#fff', backgroundColor: brand }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                              >
                                View Project Checklist
                              </button>
                            )}
                            {(String(n.type || '').startsWith('appointment') || String(n.title || '').toLowerCase().includes('appointment')) && onNavigate && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!isRead) { await handleRead(e, n); }
                                  const parts = String(n.type || '').split(':');
                                  const appointmentId = parts[1] || null;
                                  if (appointmentId) {
                                    sessionStorage.setItem('highlight_appointment_id', appointmentId);
                                  }
                                  onNavigate('appointments');
                                }}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                style={{ color: '#fff', backgroundColor: brand }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                              >
                                View Appointment
                              </button>
                            )}
                            {(n.type === 'invoice' || String(n.type || '').startsWith('payment_') || String(n.title || '').toLowerCase().includes('invoice') || String(n.title || '').toLowerCase().includes('payment')) && onNavigate && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!isRead) { await handleRead(e, n); }
                                  const invNo = getInvoiceNoFromTitle(n.title);
                                  if (invNo) {
                                    sessionStorage.setItem('highlight_invoice_number', invNo);
                                  }
                                  onNavigate('invoices');
                                }}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                style={{ color: '#fff', backgroundColor: brand }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                              >
                                View Invoice
                              </button>
                            )}
                            {(n.type === 'domain_request' || String(n.title || '').toLowerCase().includes('domain')) && onNavigate && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!isRead) { await handleRead(e, n); }
                                  onNavigate('domains_my');
                                }}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                style={{ color: '#fff', backgroundColor: brand }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                              >
                                View Domains
                              </button>
                            )}
                            {(n.type === 'hosting_request' || String(n.title || '').toLowerCase().includes('hosting')) && onNavigate && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!isRead) { await handleRead(e, n); }
                                  onNavigate('hosting_my');
                                }}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                style={{ color: '#fff', backgroundColor: brand }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                              >
                                View Hosting
                              </button>
                            )}
                            {(n.type === 'email_request' || String(n.title || '').toLowerCase().includes('email')) && onNavigate && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!isRead) { await handleRead(e, n); }
                                  onNavigate('emails_my');
                                }}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                style={{ color: '#fff', backgroundColor: brand }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                              >
                                View Emails
                              </button>
                            )}
                            {(n.type === 'ticket' || String(n.type || '').startsWith('ticket:') || String(n.title || '').toLowerCase().includes('ticket')) && onNavigate && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!isRead) { await handleRead(e, n); }
                                  const ticketId = String(n.type).startsWith('ticket:') ? String(n.type).split(':')[1] : null;
                                  if (ticketId) {
                                    sessionStorage.setItem('auto_select_ticket_id', ticketId);
                                  }
                                  onNavigate('support_tickets');
                                }}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                style={{ color: '#fff', backgroundColor: brand }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                              >
                                View Ticket
                              </button>
                            )}
                            {(n.type === 'product_assigned' || String(n.title || '').toLowerCase().includes('product')) && onNavigate && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!isRead) { await handleRead(e, n); }
                                  onNavigate('products');
                                }}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                style={{ color: '#fff', backgroundColor: brand }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                              >
                                View Products
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: subText }} />
            <p className="font-medium" style={{ color: subText }}>No notifications yet</p>
            <p className="text-sm mt-1 opacity-70" style={{ color: subText }}>
              You'll see updates about your services here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
