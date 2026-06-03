import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Plus, Eye, Loader2, MonitorSmartphone } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getCustomers, deleteCustomer, addNotification } from '@/lib/storage';
import EditCustomerDialog from '@/components/dialogs/EditCustomerDialog';
import AssignProductDialog from '@/components/dialogs/AssignProductDialog';
import AssignOptionsDialog from '@/components/dialogs/AssignOptionsDialog';
import AssignDomainDialog from '@/components/dialogs/AssignDomainDialog';
import AssignHostingDialog from '@/components/dialogs/AssignHostingDialog';
import AssignEmailDialog from '@/components/dialogs/AssignEmailDialog';
import { supabase } from '@/lib/customSupabaseClient';
import CustomerProfileAdminView from './CustomerProfileAdminView';
import { useNavigate } from 'react-router-dom';

function AdminCustomerManagement({ products, onSuccess, isDark = true }) {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [assigningCustomer, setAssigningCustomer] = useState(null);
  const [showAssignOptions, setShowAssignOptions] = useState(false);
  const [assignTargetType, setAssignTargetType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 900px)').matches;
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const c = isDark
    ? { bg: '#15161A', card: '#1C1E24', border: 'rgba(255,255,255,0.06)', text: '#fff', subText: '#a0a0a0', hover: 'rgba(255,255,255,0.04)', brand: '#e87b35' }
    : { bg: '#f8f8f7', card: '#fff', border: '#ebebeb', text: '#1a1a1a', subText: '#888', hover: '#f5f5f5', brand: '#e87b35' };

  const cardS = { background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20, boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' };
  const thS = { textAlign: 'left', padding: '11px 18px', fontSize: 10.5, fontWeight: 700, color: c.subText, textTransform: 'uppercase', letterSpacing: 1.2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', borderBottom: `1px solid ${c.border}` };
  const tdS = { padding: '13px 18px', borderTop: `1px solid ${c.border}`, fontSize: 13.5, color: c.text, verticalAlign: 'middle' };
  const tdAlt = { ...tdS, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)' };
  const emptyS = { padding: 32, textAlign: 'center', color: c.subText, fontSize: 13, fontStyle: 'italic' };

  const Btn = ({ onClick, color, children, title, filled }) => (
    <button onClick={onClick} title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
      borderRadius: 8, border: `1.5px solid ${color}`,
      background: filled ? color : 'transparent',
      color: filled ? '#fff' : color,
      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s', whiteSpace: 'nowrap'
    }}>
      {children}
    </button>
  );

  const SectionHeader = ({ title, accent }) => (
    <div style={{ padding: '15px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
      <div style={{ width: 3, height: 18, borderRadius: 2, background: accent || c.brand, flexShrink: 0 }} />
      <span style={{ fontWeight: 700, fontSize: 14, color: c.text, letterSpacing: 0.3 }}>{title}</span>
    </div>
  );

  useEffect(() => {
    loadCustomers();
    const channel = supabase
      .channel('customers_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => { loadCustomers(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const onChange = (e) => setIsMobile(e.matches);
    onChange(media);
    if (media.addEventListener) {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await getCustomers();
      setCustomers(data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load customers', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      const customer = customers.find(cu => cu.id === id);
      try {
        await deleteCustomer(id);
        addNotification({ customer_id: null, type: 'delete', title: `Customer Deleted — ${customer?.name || 'Unknown'}`, message: `Admin permanently deleted customer account: ${customer?.name || 'Unknown'} (${customer?.email || ''}).` }).catch(() => {});
        toast({ title: 'Customer Deleted' });
        loadCustomers();
      } catch (err) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    }
  };

  const handleLoginAsCustomer = async (customer) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const adminToken = session?.access_token;

      if (!adminToken) {
        toast({ title: 'Error', description: 'No admin session found', variant: 'destructive' });
        return;
      }

      if (!customer.user_id) {
        toast({ title: 'Error', description: 'Customer account has no linked user ID', variant: 'destructive' });
        return;
      }

      // Store admin token and customer info in sessionStorage
      sessionStorage.setItem('impersonation_token', 'impersonating');
      sessionStorage.setItem('impersonated_user', JSON.stringify({
        id: customer.user_id,
        customer_id: customer.id,
        email: customer.email,
        name: customer.name,
      }));
      sessionStorage.setItem('original_admin_token', adminToken);

      // Log to impersonation_logs table directly via supabase
      try {
        await supabase.from('impersonation_logs').insert({
          admin_id: session.user.id,
          target_user_id: customer.user_id,
          action: 'start',
          started_at: new Date().toISOString(),
        });
      } catch (logErr) {
        console.warn('Could not log impersonation start:', logErr);
        // Continue anyway — logging is non-critical
      }

      toast({
        title: 'Impersonation Started',
        description: `You are now viewing as ${customer.name}`,
      });

      navigate(`/admin/impersonate/${customer.id}`);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleAssignSelect = (assignType) => {
    setAssignTargetType(assignType);
    setShowAssignOptions(false);
    // Note: We intentionally keep assigningCustomer set so the specific
    // assign dialog (domain/hosting/email/product) can read it
  };

  const handleAssignClose = () => {
    setAssignTargetType(null);
    setShowAssignOptions(false);
    setAssigningCustomer(null);
  };

  const handleAssignSuccess = () => {
    handleAssignClose();
    onSuccess?.();
  };

  const filteredCustomers = customers.filter(cu =>
    cu.status !== 'rejected' &&
    ((cu.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (cu.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()))
  );

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <Loader2 className="animate-spin" size={28} style={{ color: c.brand }} />
    </div>
  );

  if (selectedCustomer) {
    return <CustomerProfileAdminView customer={selectedCustomer} onBack={() => setSelectedCustomer(null)} isDark={isDark} />;
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', width: isMobile ? '100%' : 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: c.subText }} />
          <input
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: `1.5px solid ${c.border}`, borderRadius: 10, background: c.bg, color: c.text, fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }}
            placeholder="Search customers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div style={cardS}>
        <SectionHeader title="Customers" accent={c.brand} />
        <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 940, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thS}>Name</th>
              <th style={thS}>Email</th>
              <th style={thS}>Company</th>
              <th style={thS}>Joined</th>
              <th style={{ ...thS, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer, i) => (
              <tr key={customer.id}>
                <td style={i % 2 === 0 ? tdS : tdAlt}><span style={{ fontWeight: 600 }}>{customer.name}</span></td>
                <td style={i % 2 === 0 ? tdS : tdAlt}><span style={{ color: c.subText }}>{customer.email}</span></td>
                <td style={i % 2 === 0 ? tdS : tdAlt}><span style={{ color: c.subText }}>{customer.company || '—'}</span></td>
                <td style={i % 2 === 0 ? tdS : tdAlt}><span style={{ color: c.subText }}>{new Date(customer.created_at).toLocaleDateString()}</span></td>
                <td style={{ ...(i % 2 === 0 ? tdS : tdAlt), textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <Btn color="#378ADD" onClick={() => setSelectedCustomer(customer)} title="View profile"><Eye size={12} /> View</Btn>
                    <Btn color="#8B5CF6" onClick={() => handleLoginAsCustomer(customer)} title="Login as this customer"><MonitorSmartphone size={12} /> Login as</Btn>
                    <Btn color={c.subText} onClick={() => setEditingCustomer(customer)} title="Edit"><Edit size={12} /> Edit</Btn>
                    <Btn color="#16a34a" onClick={() => { setAssigningCustomer(customer); setShowAssignOptions(true); }} title="Assign product/service"><Plus size={12} /> Assign</Btn>
                    <Btn color="#ef4444" onClick={() => handleDelete(customer.id)} title="Delete"><Trash2 size={12} /> Delete</Btn>
                  </div>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && <tr><td colSpan={5} style={emptyS}>No customers found</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {/* Assign Options Dialog */}
      <AssignOptionsDialog
        open={showAssignOptions && !!assigningCustomer}
        onClose={() => { setShowAssignOptions(false); }}
        onSelect={handleAssignSelect}
        customer={assigningCustomer}
        c={c}
      />

      {/* Assign Product Dialog (existing) */}
      {assigningCustomer && assignTargetType === 'product' && (
        <AssignProductDialog
          open={true}
          onOpenChange={() => handleAssignClose()}
          customers={[assigningCustomer]}
          products={products}
          onSuccess={handleAssignSuccess}
        />
      )}

      {/* Assign Domain Dialog */}
      <AssignDomainDialog
        open={assigningCustomer && assignTargetType === 'domain'}
        onClose={() => handleAssignClose()}
        customer={assigningCustomer}
        c={c}
        onSuccess={handleAssignSuccess}
      />

      {/* Assign Hosting Dialog */}
      <AssignHostingDialog
        open={assigningCustomer && assignTargetType === 'hosting'}
        onClose={() => handleAssignClose()}
        customer={assigningCustomer}
        c={c}
        onSuccess={handleAssignSuccess}
      />

      {/* Assign Email Dialog */}
      <AssignEmailDialog
        open={assigningCustomer && assignTargetType === 'email'}
        onClose={() => handleAssignClose()}
        customer={assigningCustomer}
        c={c}
        onSuccess={handleAssignSuccess}
      />

      {editingCustomer && (
        <EditCustomerDialog
          open={!!editingCustomer}
          onOpenChange={() => setEditingCustomer(null)}
          customer={editingCustomer}
          onSuccess={() => { setEditingCustomer(null); loadCustomers(); onSuccess?.(); }}
        />
      )}
    </div>
  );
}

export default AdminCustomerManagement;
