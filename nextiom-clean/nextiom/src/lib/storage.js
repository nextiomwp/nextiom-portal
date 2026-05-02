import { supabase } from '@/lib/customSupabaseClient';
import { handleSupabaseError } from '@/lib/supabaseHelpers';

// --- Constants ---
export const MEMBERSHIP_TYPES = {
  LIFETIME_MANUAL: 'Lifetime – Manual Updates',
  LIFETIME_LICENSE: 'Lifetime – With License Registration',
  ONE_TIME_USER: 'One Time User',
  YEARLY_NO_UPDATES: '1 Year – Without Updates',
  YEARLY_WITH_UPDATES: '1 Year – With Updates',
  YEARLY_LICENSE: '1 Year – With License Registration'
};

export const LICENSE_STATUS = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  DISABLED: 'Disabled'
};

export const DOMAIN_STATUS = {
  PENDING: 'Pending',
  CHECKING: 'Checking Availability',
  AVAILABLE: 'Available',
  PAYMENT_REQUIRED: 'Payment Required',
  PROCESSING: 'Processing',
  REGISTERED: 'Registered',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  TRANSFERRED: 'Transferred',
  CANCELLED: 'Cancelled'
};

export const HOSTING_STATUS = {
  PENDING: 'Pending',
  REVIEWING: 'Reviewing',
  PAYMENT_REQUIRED: 'Payment Required',
  PROCESSING: 'Processing',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  EXPIRED: 'Expired',
  REJECTED: 'Rejected'
};

export const HOSTING_TYPES = {
  SHARED: 'Shared Hosting',
  VPS: 'VPS Hosting',
  DEDICATED: 'Dedicated Server',
  CLOUD: 'Cloud Hosting'
};

export const HOSTING_PLANS = {
  SHARED: {
    Basic: { storage: '10GB', bandwidth: '100GB' },
    Standard: { storage: '50GB', bandwidth: '500GB' },
    Premium: { storage: 'Unlimited', bandwidth: 'Unlimited' }
  },
  VPS: {
    VPS1: { storage: '50GB NVMe', bandwidth: '2TB' },
    VPS2: { storage: '100GB NVMe', bandwidth: '5TB' }
  },
  DEDICATED: { Standard: {} },
  CLOUD: { Standard: {} }
};

export const REQUEST_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed'
};

export const REQUEST_TYPE = {
  REGISTRATION: 'Registration',
  RENEWAL: 'Renewal',
  TRANSFER: 'Transfer',
  CANCELLATION: 'Cancellation',
  UPGRADE: 'Upgrade',
  DOWNGRADE: 'Downgrade',
  SUPPORT: 'Support',
  DNS_CHANGE: 'DNS Change',
  NAMESERVER: 'Nameserver Update',
  CONTACT: 'Contact Update',
  DOMAIN_CHANGE: 'Domain Change',
  BACKUP_RESTORE: 'Backup Restore',
  CPANEL_RESEND: 'Resend cPanel',
  DOMAIN_REGISTRATION: 'New Domain Registration',
  NEW_ORDER: 'New Order'
};

// --- Customers ---

export const getCustomers = async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'getCustomers');
  return data || [];
};

export const getCustomerById = async (id) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) handleSupabaseError(error, 'getCustomerById');
  return data;
};

export const getCustomerByEmail = async (email) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) handleSupabaseError(error, 'getCustomerByEmail');
  return data;
};

export const resolveCustomerId = async ({ customerId, userId, email } = {}) => {
  if (customerId) {
    const byId = await getCustomerById(customerId).catch(() => null);
    if (byId?.id) return byId.id;
  }

  if (userId) {
    const byUser = await getUserProfile(userId).catch(() => null);
    if (byUser?.id) return byUser.id;
  }

  if (email) {
    const byEmail = await getCustomerByEmail(email).catch(() => null);
    if (byEmail?.id) return byEmail.id;
  }

  return customerId || null;
};

export const addCustomer = async (customerData) => {
  const { data, error } = await supabase
    .from('customers')
    .insert([customerData])
    .select()
    .single();

  if (error) handleSupabaseError(error, 'addCustomer');
  return data;
};

export const updateCustomer = async (id, updates) => {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleSupabaseError(error, 'updateCustomer');
  return data;
};

export const deleteCustomer = async (id) => {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) handleSupabaseError(error, 'deleteCustomer');
  return true;
};

// --- Products ---

export const getProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'getProducts');
  return data || [];
};

export const getProductById = async (id) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) handleSupabaseError(error, 'getProductById');
  return data;
};

export const addProduct = async (productData) => {
  const { data, error } = await supabase
    .from('products')
    .insert([productData])
    .select()
    .single();

  if (error) handleSupabaseError(error, 'addProduct');
  return data;
};

export const updateProduct = async (id, updates) => {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleSupabaseError(error, 'updateProduct');
  return data;
};

export const deleteProduct = async (id) => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) handleSupabaseError(error, 'deleteProduct');
  return true;
};

// --- Domains ---

export const getDomains = async () => {
  const { data, error } = await supabase
    .from('domains')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'getDomains');
  return data || [];
};

export const getDomainRequests = async () => {
  const { data, error } = await supabase
    .from('domain_requests')
    .select('*, customers(name, email)')
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'getDomainRequests');
  return data || [];
};

export const getDomainById = async (id) => {
  const { data, error } = await supabase
    .from('domains')
    .select('*')
    .eq('id', id)
    .single();

  if (error) handleSupabaseError(error, 'getDomainById');
  return data;
};

export const getCustomerDomains = async (customerId) => {
  const { data, error } = await supabase
    .from('domains')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'getCustomerDomains');
  return data || [];
};

export const getCustomerDomainRequests = async (customerId) => {
  const { data, error } = await supabase
    .from('domain_requests')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'getCustomerDomainRequests');
  return data || [];
};

export const addDomain = async (domainData) => {
  const { data, error } = await supabase
    .from('domains')
    .insert([domainData])
    .select()
    .single();

  if (error) handleSupabaseError(error, 'addDomain');
  return data;
};

export const updateDomain = async (id, updates) => {
  const { data, error } = await supabase
    .from('domains')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleSupabaseError(error, 'updateDomain');
  return data;
};

export const updateDomainRequest = async (id, updates) => {
  const { data, error } = await supabase
    .from('domain_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleSupabaseError(error, 'updateDomainRequest');
  return data;
};

export const deleteDomain = async (id) => {
  const { error } = await supabase
    .from('domains')
    .delete()
    .eq('id', id);

  if (error) handleSupabaseError(error, 'deleteDomain');
  return true;
};

// --- Hosting ---

export const getHostingPackages = async () => {
  const { data, error } = await supabase
    .from('hosting_packages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'getHostingPackages');
  return data || [];
};

export const getHostingRequests = async () => {
  const { data, error } = await supabase
    .from('hosting_requests')
    .select('*, customers(name, email)')
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'getHostingRequests');
  return data || [];
};

export const getHostingById = async (id) => {
  const { data, error } = await supabase
    .from('hosting_packages')
    .select('*')
    .eq('id', id)
    .single();

  if (error) handleSupabaseError(error, 'getHostingById');
  return data;
};

export const getCustomerHostingPackages = async (customerId) => {
  const { data, error } = await supabase
    .from('hosting_packages')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'getCustomerHostingPackages');
  return data || [];
};

export const getCustomerHostingRequests = async (customerId) => {
  const { data, error } = await supabase
    .from('hosting_requests')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'getCustomerHostingRequests');
  return data || [];
};

export const addHostingPackage = async (hostingData) => {
  const { data, error } = await supabase
    .from('hosting_packages')
    .insert([hostingData])
    .select()
    .single();

  if (error) handleSupabaseError(error, 'addHostingPackage');
  return data;
};

export const updateHostingPackage = async (id, updates) => {
  const { data, error } = await supabase
    .from('hosting_packages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleSupabaseError(error, 'updateHostingPackage');
  return data;
};

export const updateHostingRequest = async (id, updates) => {
  const { data, error } = await supabase
    .from('hosting_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) handleSupabaseError(error, 'updateHostingRequest');
  return data;
};

export const deleteHosting = async (id) => {
  const { error } = await supabase
    .from('hosting_packages')
    .delete()
    .eq('id', id);

  if (error) handleSupabaseError(error, 'deleteHosting');
  return true;
};

// --- Customer Services (Aggregated) ---

export const getCustomerServices = async (customerId) => {
  try {
    const [domains, hosting, licenses, domainReqs, hostingReqs] = await Promise.all([
      getCustomerDomains(customerId),
      getCustomerHostingPackages(customerId),
      getLicenses(customerId),
      getCustomerDomainRequests(customerId),
      getCustomerHostingRequests(customerId)
    ]);

    return [
      ...domains.map(d => ({ ...d, type: 'domain', name: d.name || 'Domain' })),
      ...domainReqs.map(r => ({ ...r, type: 'domain request', name: r.domain_name || 'Domain', isRequest: true })),
      ...hosting.map(h => ({ ...h, type: 'hosting', name: h.package_name || 'Hosting' })),
      ...hostingReqs.map(r => ({ ...r, type: 'hosting request', name: r.package_type?.split('|')[0]?.trim() || r.package_name || 'Hosting', isRequest: true })),
      ...licenses.map(l => ({ ...l, type: 'license', name: 'Software License' }))
    ];
  } catch (error) {
    console.error('getCustomerServices error:', error);
    return [];
  }
};

export const getLicenses = async (customerId) => {
  let query = supabase.from('licenses').select('*, products(name)');

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data, error } = await query;
  if (error) handleSupabaseError(error, 'getLicenses');

  return (data || []).map(l => ({
    ...l,
    name: l.products?.name || 'Unknown Product'
  }));
};

// --- Notifications ---

export const getNotifications = async (userId) => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('customer_id', userId)
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'getNotifications');
  return data || [];
};

export const getAdminNotifications = async () => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'getAdminNotifications');
  return data || [];
};

export const addNotification = async (notificationData) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert([notificationData])
    .select()
    .single();

  if (error) handleSupabaseError(error, 'addNotification');
  return data;
};

export const markAsRead = async (id) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_status: true })
    .eq('id', id)
    .select()
    .single();

  if (error) handleSupabaseError(error, 'markAsRead');
  return data;
};

export const markAllNotificationsAsRead = async (customerId) => {
  if (!customerId) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read_status: true })
    .eq('customer_id', customerId)
    .eq('read_status', false);

  if (error) handleSupabaseError(error, 'markAllNotificationsAsRead');
};

export const deleteNotification = async (id) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);

  if (error) handleSupabaseError(error, 'deleteNotification');
  return true;
};

// --- User Profile ---

export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) handleSupabaseError(error, 'getUserProfile');
  return data;
};

export const updateUserProfile = async (customerId, updates) => {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', customerId)
    .select()
    .single();

  if (error) handleSupabaseError(error, 'updateUserProfile');
  return data;
};

// --- Orders/Invoices ---

export const getOrders = async (customerId) => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error, 'getOrders');
  return data || [];
};

// --- Stats & Logs ---

export const getStorageStats = async () => {
  const { count: customers } = await supabase.from('customers').select('*', { count: 'exact', head: true });
  const { count: domains } = await supabase.from('domains').select('*', { count: 'exact', head: true });
  const { count: hosting } = await supabase.from('hosting_packages').select('*', { count: 'exact', head: true });

  return {
    totalCustomers: customers || 0,
    totalDomains: domains || 0,
    activeMemberships: hosting || 0,
    expiringSoon: 0,
    expired: 0
  };
};

export const getEmailLogs = async () => {
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn("Could not fetch email logs", error);
    return [];
  }
  return data || [];
};

// --- Utils ---

export const calculateExpiryStatus = (expiryDate) => {
  if (!expiryDate) return { status: 'Active', daysLeft: null };
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { status: 'Expired', daysLeft: diffDays };
  if (diffDays <= 30) return { status: 'Expiring Soon', daysLeft: diffDays };
  return { status: 'Active', daysLeft: diffDays };
};

export const generateId = () => crypto.randomUUID();

export const initializeDemoData = () => {
  console.log('Demo data initialization skipped in Supabase mode');
};

export const addDomainActivityLog = async (domainId, action, details) => {
  console.log('Log added:', domainId, action, details);
  return true;
};

export const getDomainActivityLog = (domainId) => {
  return [];
};

export const getHostingActivityLog = (packageId) => {
  return [];
};

// --- Hosting Plans (Admin Templates) ---

export const getHostingPlans = async () => {
  const { data, error } = await supabase
    .from('hosting_plans')
    .select('*')
    .order('hosting_type', { ascending: true })
    .order('plan_name', { ascending: true });
  if (error) handleSupabaseError(error, 'getHostingPlans');
  return data || [];
};

export const getActiveHostingPlans = async () => {
  const { data, error } = await supabase
    .from('hosting_plans')
    .select('*')
    .eq('is_active', true)
    .order('hosting_type', { ascending: true })
    .order('plan_name', { ascending: true });
  if (error) handleSupabaseError(error, 'getActiveHostingPlans');
  return data || [];
};

export const addHostingPlan = async (planData) => {
  const { data, error } = await supabase
    .from('hosting_plans')
    .insert([planData])
    .select()
    .single();
  if (error) handleSupabaseError(error, 'addHostingPlan');
  return data;
};

export const updateHostingPlan = async (id, updates) => {
  const { data, error } = await supabase
    .from('hosting_plans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) handleSupabaseError(error, 'updateHostingPlan');
  return data;
};

export const deleteHostingPlan = async (id) => {
  const { error } = await supabase
    .from('hosting_plans')
    .delete()
    .eq('id', id);
  if (error) handleSupabaseError(error, 'deleteHostingPlan');
  return true;
};

// --- Requests (Real Supabase) ---

export const addDomainRequest = async (requestData) => {
  const { data, error } = await supabase
    .from('domain_requests')
    .insert([{
      customer_id: requestData.customerId,
      domain_name: requestData.details?.domain,
      status: 'pending',
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    handleSupabaseError(error, 'addDomainRequest');
  }

  // Notify admin - include period and notes in message
  const period = requestData.details?.period || '1';
  const notes = requestData.details?.notes ? ` - Notes: ${requestData.details.notes}` : '';
  await supabase.from('notifications').insert([{
    type: 'domain_request',
    title: 'New Domain Request',
    message: `Domain registration requested: ${requestData.details?.domain} (${period} Year${period !== '1' ? 's' : ''})${notes}`,
    customer_id: requestData.customerId,
    is_read: false,
    created_at: new Date().toISOString()
  }]);

  return data;
};

export const addHostingRequest = async (requestData) => {
  const packageLabel = requestData.details?.package || 'Hosting Request';
  const requestSummary = `${packageLabel} | Billing: ${requestData.details?.billing || 'N/A'} | Domain: ${requestData.details?.domain || 'N/A'} | Notes: ${requestData.details?.notes || 'None'}`;
  const { data, error } = await supabase
    .from('hosting_requests')
    .insert([{
      customer_id: requestData.customerId,
      package_type: requestSummary,
      status: 'pending',
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    handleSupabaseError(error, 'addHostingRequest');
  }

  // Notify admin
  await supabase.from('notifications').insert([{
    type: 'hosting_request',
    title: 'New Hosting Request',
    message: `Hosting package requested: ${packageLabel}`,
    customer_id: requestData.customerId,
    is_read: false,
    created_at: new Date().toISOString()
  }]);

  return data;
};

export const assignProductToCustomer = async (data) => {
  console.log('Product assigned:', data);
  return true;
};

export const deleteDomainRequest = async (id) => {
  const { error } = await supabase
    .from('domain_requests')
    .delete()
    .eq('id', id);

  if (error) handleSupabaseError(error, 'deleteDomainRequest');
  return true;
};

export const deleteHostingRequest = async (id) => {
  const { error } = await supabase
    .from('hosting_requests')
    .delete()
    .eq('id', id);

  if (error) handleSupabaseError(error, 'deleteHostingRequest');
  return true;
};

export const updateLicense = async (id, updates) => {
  console.log('License updated:', id, updates);
  return true;
};

export const generateLicenseKey = () => {
  return 'XXXX-XXXX-XXXX-XXXX'.replace(/X/g, () => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.random() * 36 | 0]);
};

export const getSettings = () => {
  return {
    emailRemindersEnabled: false,
    reminderDaysBefore: 15,
    adminEmail: ''
  };
};

export const saveSettings = (settings) => {
  console.log('Settings saved:', settings);
  localStorage.setItem('app_settings', JSON.stringify(settings));
};

// ── Ticket Functions ──────────────────────────────────────────

export const createTicket = async (customerId, subject, priority = 'normal') => {
  const { data, error } = await supabase
    .from('tickets')
    .insert([{ customer_id: customerId, subject, priority, status: 'open' }])
    .select()
    .single();
  if (error) handleSupabaseError(error, 'createTicket');
  return data;
};

export const getTicketsByCustomer = async (customerId) => {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, ticket_messages(*)')
    .eq('customer_id', customerId)
    .order('updated_at', { ascending: false });
  if (error) handleSupabaseError(error, 'getTicketsByCustomer');
  return data || [];
};

export const getAllTickets = async () => {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, customers(name, email), ticket_messages(*)')
    .order('updated_at', { ascending: false });
  if (error) handleSupabaseError(error, 'getAllTickets');
  return data || [];
};

export const addTicketMessage = async (ticketId, senderRole, message) => {
  const { data, error } = await supabase
    .from('ticket_messages')
    .insert([{ ticket_id: ticketId, sender_role: senderRole, message }])
    .select()
    .single();
  if (error) handleSupabaseError(error, 'addTicketMessage');
  await supabase.from('tickets').update({ updated_at: new Date().toISOString() }).eq('id', ticketId);
  return data;
};

export const getTicketMessages = async (ticketId) => {
  const { data, error } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) handleSupabaseError(error, 'getTicketMessages');
  return data || [];
};

export const closeTicket = async (ticketId) => {
  const { error } = await supabase
    .from('tickets')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', ticketId);
  if (error) handleSupabaseError(error, 'closeTicket');
  return true;
};

export const getUnreadTicketCount = async () => {
  const { data, error } = await supabase
    .from('tickets')
    .select('id, ticket_messages(sender_role)')
    .eq('status', 'open');
  if (error) return 0;
  return (data || []).filter(t =>
    !(t.ticket_messages || []).some(m => m.sender_role === 'admin')
  ).length;
};