import React, { useState, useEffect } from 'react';
import { Search, Loader2, ShoppingCart, Globe, Server, Mail, Calendar, CheckCircle2, Clock, XCircle, ArrowRight, Download, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { resolveCustomerId } from '@/lib/storage';

function statusStyle(status, isDark) {
  const s = String(status || '').toLowerCase();
  if (['approved', 'completed', 'active', 'registered', 'connected'].includes(s))
    return { bg: isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7', color: '#16a34a', icon: CheckCircle2 };
  if (s.startsWith('pending'))
    return { bg: isDark ? 'rgba(234,179,8,0.15)' : '#fef9c3', color: '#ca8a04', icon: Clock };
  if (['rejected', 'cancelled', 'disabled', 'expired', 'suspended'].includes(s))
    return { bg: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2', color: '#dc2626', icon: XCircle };
  return { bg: isDark ? 'rgba(100,116,139,0.15)' : '#f1f5f9', color: '#64748b', icon: Info };
}

function OrderHistoryPage({ user, isDark = false, c = {} }) {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const brand = c.brand || '#E87B35';
  const brandLight = c.brandLight || 'rgba(232,123,53,0.1)';
  const border = c.border || '#ebebeb';
  const borderStrong = c.borderStrong || '#d0d0d0';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const panel2 = c.panel2 || '#f5f5f5';
  const hover = c.hover || '#f5f5f5';

  useEffect(() => {
    loadOrderHistory();
  }, [user?.id, user?.email]);

  const loadOrderHistory = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const customerId = await resolveCustomerId({ customerId: user.id, userId: user.id, email: user.email });
      if (!customerId) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      // Fetch all three requests tables in parallel
      const [domainsRes, hostingRes, emailRes] = await Promise.all([
        supabase.from('domain_requests')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),
        supabase.from('hosting_requests')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),
        supabase.from('email_requests')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
      ]);

      const formattedDomains = (domainsRes.data || []).map(item => ({
        id: `dom-${item.id}`,
        displayId: `DOM-${item.id.slice(0, 8).toUpperCase()}`,
        date: item.created_at,
        rawType: 'domain',
        type: 'Domain Registration',
        name: item.domain_name,
        status: item.status || 'pending',
        notes: item.notes || 'No notes provided',
        period: item.registration_period ? `${item.registration_period} Year(s)` : 'N/A',
        renew: item.auto_renew ? 'Yes' : 'No',
        document_url: item.document_url,
        icon: Globe,
        iconColor: '#3b82f6',
        iconBg: isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe'
      }));

      const formattedHosting = (hostingRes.data || []).map(item => {
        // package_type format example: "Standard - Hosting | Billing: Monthly | Domain: mydomain.com | Notes: ..."
        const rawType = item.package_type || '';
        const parts = rawType.split('|');
        const planName = parts[0]?.trim() || 'Hosting Order';
        
        let billingVal = 'N/A';
        let domainVal = 'N/A';
        let noteVal = 'No notes provided';

        parts.forEach(p => {
          const lower = p.toLowerCase();
          if (lower.includes('billing:')) billingVal = p.split(':')[1]?.trim() || billingVal;
          if (lower.includes('domain:')) domainVal = p.split(':')[1]?.trim() || domainVal;
          if (lower.includes('notes:')) noteVal = p.split(':')[1]?.trim() || noteVal;
        });

        return {
          id: `host-${item.id}`,
          displayId: `HST-${item.id.slice(0, 8).toUpperCase()}`,
          date: item.created_at,
          rawType: 'hosting',
          type: 'Web Hosting',
          name: planName,
          status: item.status || 'pending',
          notes: noteVal,
          period: billingVal,
          domainName: domainVal,
          renew: item.auto_renew ? 'Yes' : 'No',
          document_url: item.document_url,
          icon: Server,
          iconColor: '#7c3aed',
          iconBg: isDark ? 'rgba(124,58,237,0.15)' : '#ede9fe'
        };
      });

      const formattedEmails = (emailRes.data || []).map(item => ({
        id: `email-${item.id}`,
        displayId: `EML-${item.id.slice(0, 8).toUpperCase()}`,
        date: item.created_at,
        rawType: 'email',
        type: 'Email Registration',
        name: item.email,
        status: item.status || 'pending',
        notes: item.notes || 'No notes provided',
        period: item.registration_period ? `${item.registration_period} Year(s)` : 'N/A',
        renew: item.auto_renew ? 'Yes' : 'No',
        document_url: item.document_url,
        icon: Mail,
        iconColor: '#ea580c',
        iconBg: isDark ? 'rgba(234,88,12,0.15)' : '#ffedd5'
      }));

      const combined = [...formattedDomains, ...formattedHosting, ...formattedEmails].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      setOrders(combined);
    } catch (err) {
      console.error('Failed to load order history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadDoc = async (docUrl) => {
    if (!docUrl) return;
    try {
      const cleanPath = String(docUrl)
        .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/request-documents\//, '')
        .replace(/^request-documents\//, '')
        .replace(/^\/+/, '');

      const { data, error } = await supabase.storage.from('request-documents').createSignedUrl(cleanPath, 60);
      if (error) {
        // Fallback to public URL
        const { data: pub } = supabase.storage.from('request-documents').getPublicUrl(cleanPath);
        if (pub?.publicUrl) window.open(pub.publicUrl, '_blank');
      } else if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error('Download document error:', err);
    }
  };

  // Filter logic
  const filteredOrders = orders.filter(o => {
    const matchesSearch = (o.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (o.displayId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (o.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || o.rawType === typeFilter;

    let matchesStatus = true;
    const s = String(o.status).toLowerCase();
    if (statusFilter === 'pending') {
      matchesStatus = s.startsWith('pending');
    } else if (statusFilter === 'active') {
      matchesStatus = ['approved', 'completed', 'active', 'registered', 'connected'].includes(s);
    } else if (statusFilter === 'cancelled') {
      matchesStatus = ['rejected', 'cancelled', 'disabled', 'expired', 'suspended'].includes(s);
    }

    return matchesSearch && matchesType && matchesStatus;
  });

  const toggleExpand = (id) => {
    setExpandedOrderId(prev => (prev === id ? null : id));
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Loader2 style={{ width: 28, height: 28, color: brand }} className="animate-spin" />
      </div>
    );
  }

  const containerStyle = {
    background: isDark ? 'rgba(28,30,36,0.85)' : 'rgba(255,255,255,0.9)',
    border: `1px solid ${border}`,
    borderRadius: 20,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 2px 16px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    boxSizing: 'border-box'
  };

  const inputStyle = {
    width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 8, paddingBottom: 8,
    fontSize: 13, border: `1px solid ${borderStrong}`,
    borderRadius: 10, background: panel2, color: text, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  };

  const selectStyle = {
    padding: '8px 12px', fontSize: 13, border: `1px solid ${borderStrong}`,
    borderRadius: 10, background: panel2, color: text, outline: 'none',
    fontFamily: 'inherit', cursor: 'pointer'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart style={{ width: 16, height: 16, color: brand }} />
          </div>
          <h1 style={{ color: text, fontSize: 18, fontWeight: 700, margin: 0 }}>Order History</h1>
        </div>
        <p style={{ color: subText, fontSize: 12, margin: 0 }}>
          Track status and details of your domain, hosting, and email orders.
        </p>
      </div>

      {/* Filters and Search Bar */}
      <div style={containerStyle}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: subText }} />
            <input
              type="text"
              placeholder="Search by ID, name, notes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = brand}
              onBlur={e => e.target.style.borderColor = borderStrong}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Types</option>
              <option value="domain">Domain Registrations</option>
              <option value="hosting">Web Hostings</option>
              <option value="email">Email Registrations</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Approved / Active</option>
              <option value="cancelled">Cancelled / Rejected</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: panel2 }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: subText, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${border}` }}>Order ID</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: subText, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${border}` }}>Order Details</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: subText, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${border}` }}>Date Placed</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: subText, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${border}` }}>Status</th>
                <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: subText, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${border}` }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((o) => {
                  const { bg, color, icon: StatusIcon } = statusStyle(o.status, isDark);
                  const isExpanded = expandedOrderId === o.id;
                  const TypeIcon = o.icon;

                  return (
                    <React.Fragment key={o.id}>
                      <tr
                        style={{ borderBottom: `1px solid ${border}`, transition: 'background 0.12s', cursor: 'pointer' }}
                        onClick={() => toggleExpand(o.id)}
                        onMouseEnter={e => e.currentTarget.style.background = hover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '14px 20px', color: text, fontWeight: 700, fontSize: 12 }}>
                          {o.displayId}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: o.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <TypeIcon style={{ width: 14, height: 14, color: o.iconColor }} />
                            </div>
                            <div>
                              <p style={{ color: text, fontSize: 13, fontWeight: 600, margin: 0 }}>{o.name}</p>
                              <p style={{ color: subText, fontSize: 11, margin: 0 }}>{o.type}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', color: text, fontSize: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar style={{ width: 13, height: 13, color: subText }} />
                            <span>
                              {new Date(o.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              {', '}
                              {new Date(o.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: bg, color, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99 }}>
                            <StatusIcon style={{ width: 12, height: 12 }} />
                            {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(o.id); }}
                            style={{ background: 'none', border: 'none', color: subText, cursor: 'pointer', padding: 4 }}
                          >
                            {isExpanded ? <ChevronUp style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} style={{ padding: '16px 20px', background: panel2, borderBottom: `1px solid ${border}` }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', md: 'repeat(2, 1fr)', gap: 20 }}>
                              {/* Left Panel: Specifications */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <h3 style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Order Configuration</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', fontSize: 12 }}>
                                  <span style={{ color: subText }}>Order Type:</span>
                                  <span style={{ color: text, fontWeight: 500 }}>{o.type}</span>
                                  
                                  {o.rawType === 'hosting' && (
                                    <>
                                      <span style={{ color: subText }}>Target Domain:</span>
                                      <span style={{ color: text, fontWeight: 500 }}>{o.domainName}</span>
                                    </>
                                  )}

                                  <span style={{ color: subText }}>Billing / Term:</span>
                                  <span style={{ color: text, fontWeight: 500 }}>{o.period}</span>

                                  <span style={{ color: subText }}>Auto Renew:</span>
                                  <span style={{ color: text, fontWeight: 500 }}>{o.renew}</span>

                                  {o.document_url && (
                                    <>
                                      <span style={{ color: subText }}>Attachment:</span>
                                      <button 
                                        onClick={() => handleDownloadDoc(o.document_url)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: brand, padding: 0, cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'underline', width: 'fit-content' }}
                                      >
                                        <Download style={{ width: 13, height: 13 }} /> Download Document
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Right Panel: Notes & Description */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <h3 style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>User Notes & Requirements</h3>
                                <div style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#fff', border: `1px solid ${border}`, borderRadius: 10, padding: 12, fontSize: 12, color: text, minHeight: 60, lineHeight: 1.5 }}>
                                  {o.notes}
                                </div>

                                {/* Mini tracker timeline */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 11 }}>
                                  <span style={{ color: subText }}>Order Timeline:</span>
                                  <span style={{ color: '#16a34a', fontWeight: 600 }}>Placed</span>
                                  <ArrowRight style={{ width: 10, height: 10, color: subText }} />
                                  <span style={{ color: String(o.status).toLowerCase() === 'pending' ? brand : subText, fontWeight: 600 }}>In Review</span>
                                  <ArrowRight style={{ width: 10, height: 10, color: subText }} />
                                  <span style={{
                                    color: ['approved', 'completed', 'active'].includes(String(o.status).toLowerCase()) ? '#16a34a' : (['rejected', 'cancelled'].includes(String(o.status).toLowerCase()) ? '#dc2626' : subText),
                                    fontWeight: 600
                                  }}>
                                    Finished
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', color: subText, fontSize: 13 }}>
                    No orders match the search and filter settings.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default OrderHistoryPage;
