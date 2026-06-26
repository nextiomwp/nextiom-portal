import React, { useState, useEffect } from 'react';
import { Megaphone, Search, CheckCircle, CheckSquare, Calendar, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

function AnnouncementsPage({ user, isDark = false, c = {} }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'unread', 'read'
  const { toast } = useToast();

  const brand = c.brand || 'var(--brand-color)';
  const brandLight = c.brandLight || 'var(--brand-color-light)';
  const border = c.border || '#ebebeb';
  const borderStrong = c.borderStrong || '#d0d0d0';
  const text = c.text || '#1a1a1a';
  const subText = c.subText || '#888';
  const panel2 = c.panel2 || '#f5f5f5';

  useEffect(() => {
    loadAnnouncements();
  }, [user?.id]);

  const loadAnnouncements = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('customer_id', user.id)
        .eq('type', 'announcement')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const now = new Date();
      const activeAnnouncements = (data || []).filter(ann => {
        if (ann.start_date && new Date(ann.start_date) > now) return false;
        if (ann.end_date && new Date(ann.end_date) < now) return false;
        return true;
      });
      
      setAnnouncements(activeAnnouncements);
    } catch (err) {
      console.error('Failed to load announcements:', err);
      toast({
        title: 'Error',
        description: 'Failed to load announcements. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('id', id);

      if (error) throw error;

      setAnnouncements(prev =>
        prev.map(ann => (ann.id === id ? { ...ann, read_status: true } : ann))
      );
      toast({
        title: 'Success',
        description: 'Announcement marked as read.',
      });
    } catch (err) {
      console.error('Failed to update announcement status:', err);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = announcements.filter(ann => !ann.read_status);
    if (unread.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('customer_id', user.id)
        .eq('type', 'announcement')
        .eq('read_status', false);

      if (error) throw error;

      setAnnouncements(prev => prev.map(ann => ({ ...ann, read_status: true })));
      toast({
        title: 'Success',
        description: 'All announcements marked as read.',
      });
    } catch (err) {
      console.error('Failed to mark all announcements as read:', err);
      toast({
        title: 'Error',
        description: 'Failed to mark all as read.',
        variant: 'destructive',
      });
    }
  };

  const filtered = announcements.filter(ann => {
    const matchesSearch =
      (ann.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ann.message || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (filterMode === 'unread') return matchesSearch && !ann.read_status;
    if (filterMode === 'read') return matchesSearch && ann.read_status;
    return matchesSearch;
  });

  const unreadCount = announcements.filter(ann => !ann.read_status).length;

  const cardStyle = {
    background: isDark ? 'rgba(28,30,36,0.85)' : 'rgba(255,255,255,0.9)',
    border: `1px solid ${border}`,
    borderRadius: 20,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.2)' : '0 2px 16px rgba(0,0,0,0.05)',
    padding: '24px',
    boxSizing: 'border-box',
  };

  const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Megaphone style={{ width: 16, height: 16, color: brand }} />
          </div>
          <div>
            <h1 style={{ color: text, fontSize: 18, fontWeight: 700, margin: 0 }}>Announcements</h1>
            <p style={{ color: subText, fontSize: 11, margin: 0 }}>Official platform updates, releases, and notifications</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              background: brandLight,
              color: brand,
              border: `1px solid ${brand}`,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = brand;
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = brandLight;
              e.currentTarget.style.color = brand;
            }}
          >
            <CheckSquare style={{ width: 14, height: 14 }} />
            Mark all as read
          </button>
        )}
      </div>

      {/* Toolbar (Search & Filter) */}
      <div style={{
        ...cardStyle,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: 200, maxWidth: 400 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: subText }} />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              border: `1.5px solid ${border}`,
              borderRadius: 10,
              background: panel2,
              color: text,
              fontSize: 13,
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: subText, cursor: 'pointer' }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderRadius: 8, background: panel2, padding: 3, border: `1px solid ${border}` }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'read', label: 'Read' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: filterMode === tab.id ? brand : 'transparent',
                color: filterMode === tab.id ? '#fff' : subText,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader2 style={{ width: 32, height: 32, color: brand }} className="animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map(ann => {
            const isUnread = !ann.read_status;
            return (
              <div
                key={ann.id}
                style={{
                  ...cardStyle,
                  borderLeft: isUnread ? `4px solid ${brand}` : `1px solid ${border}`,
                  padding: '20px 24px',
                  position: 'relative',
                  transition: 'transform 0.15s, border-color 0.15s',
                  cursor: isUnread ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (isUnread) {
                    handleMarkAsRead(ann.id);
                  }
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  if (!isUnread) {
                    e.currentTarget.style.borderColor = brand;
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  if (!isUnread) {
                    e.currentTarget.style.borderColor = border;
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h2 style={{ color: text, fontSize: 15, fontWeight: 700, margin: 0 }}>{ann.title}</h2>
                    {isUnread && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        backgroundColor: brandLight,
                        color: brand,
                        padding: '2px 8px',
                        borderRadius: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        New
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: subText, fontSize: 11 }}>
                    <span>{fmtDate(ann.created_at)}</span>
                  </div>
                </div>

                <p style={{ color: isUnread ? text : subText, fontSize: 13, lineHeight: 1.6, margin: '0 0 16px 0', whiteSpace: 'pre-wrap' }}>
                  {ann.message}
                </p>

                {isUnread && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(ann.id);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        background: 'transparent',
                        color: brand,
                        border: `1px solid ${brand}`,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = brandLight;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <CheckCircle style={{ width: 12, height: 12 }} />
                      Mark as Read
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          ...cardStyle,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center'
        }}>
          <Megaphone style={{ width: 36, height: 36, color: subText, opacity: 0.3, marginBottom: 12 }} />
          <h3 style={{ color: text, fontSize: 14, fontWeight: 700, margin: '0 0 4px 0' }}>No announcements found</h3>
          <p style={{ color: subText, fontSize: 12, margin: 0, maxWidth: 300 }}>
            {searchTerm ? 'Try adjusting your search query or filters.' : 'You are all caught up! No recent platform announcements.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default AnnouncementsPage;
