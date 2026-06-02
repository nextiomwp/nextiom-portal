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

export const parseHostingPackageSummary = (summary) => {
  const raw = String(summary || '');
  const mainPart = raw.split('|')[0]?.trim() || '';
  const dashIndex = mainPart.indexOf(' - ');
  const hostingType = dashIndex >= 0 ? mainPart.slice(0, dashIndex).trim() : mainPart;
  const planName = dashIndex >= 0 ? mainPart.slice(dashIndex + 3).trim() : mainPart;

  const extractField = (label) => {
    const match = raw.match(new RegExp(`${label}:\\s*([^|;\\n]+)`, 'i'));
    return match?.[1]?.trim() || '';
  };

  return {
    hostingType,
    planName,
    billingPeriod: extractField('Billing'),
    domain: extractField('Domain'),
    notes: extractField('Notes'),
  };
};

const calculateHostingExpiryDate = (billingPeriod, startDate) => {
  const base = startDate ? new Date(startDate) : new Date();
  const billing = String(billingPeriod || '').toLowerCase();

  if (billing.includes('yearly') || billing.includes('annual') || billing.includes('12')) {
    base.setFullYear(base.getFullYear() + 1);
  } else if (billing.includes('6') || billing.includes('semi')) {
    base.setMonth(base.getMonth() + 6);
  } else if (billing.includes('3') || billing.includes('quarter')) {
    base.setMonth(base.getMonth() + 3);
  } else if (billing.includes('2') && !billing.includes('month')) {
    base.setFullYear(base.getFullYear() + 2);
  } else {
    base.setMonth(base.getMonth() + 1);
  }

  return base.toISOString();
};

const getHostingPlanLimits = async (hostingType, planName) => {
  if (!hostingType || !planName) return { disk_usage_limit: null, bandwidth_limit: null };

  try {
    const plans = await getHostingPlans();
    const plan = (plans || []).find(p => p.hosting_type === hostingType && p.plan_name === planName);
    return {
      disk_usage_limit: plan?.storage || null,
      bandwidth_limit: plan?.bandwidth || null,
    };
  } catch {
    return { disk_usage_limit: null, bandwidth_limit: null };
  }
};

export const buildHostingRequestUpdatePayload = async (request, { status, startDate } = {}) => {
  const parsed = parseHostingPackageSummary(request?.package_type || '');
  const normalizedStatus = String(status || request?.status || '').toLowerCase();
  const isApproved = ['approved', 'completed'].includes(normalizedStatus);
  const startIso = isApproved ? (startDate ? new Date(startDate).toISOString() : new Date().toISOString()) : undefined;
  const limits = isApproved
    ? await getHostingPlanLimits(request?.hosting_type || parsed.hostingType, request?.plan_name || parsed.planName)
    : { disk_usage_limit: null, bandwidth_limit: null };

  return {
    status: normalizedStatus,
    updated_at: new Date().toISOString(),
    ...(isApproved ? { start_date: startIso } : {}),
    hosting_type: request?.hosting_type || parsed.hostingType || null,
    plan_name: request?.plan_name || parsed.planName || null,
    billing_period: request?.billing_period || parsed.billingPeriod || null,
    domain: request?.domain || request?.domain_name || parsed.domain || null,
    notes: request?.notes || parsed.notes || null,
    expiry_date: request?.expiry_date || (isApproved && (request?.billing_period || parsed.billingPeriod) ? calculateHostingExpiryDate(request?.billing_period || parsed.billingPeriod, startIso) : null),
    disk_usage_limit: request?.disk_usage_limit || limits.disk_usage_limit || null,
    bandwidth_limit: request?.bandwidth_limit || limits.bandwidth_limit || null,
    cpanel: request?.cpanel || request?.cpanel || null,
    ftp: request?.ftp || request?.ftp || null,
    additional_credentials: request?.additional_credentials || request?.additionalCredentials || null,
    customer_message: request?.customer_message || request?.customerMessage || null,
    show_hosting_access: request?.show_hosting_access ?? request?.showHostingAccess ?? true,
    show_ftp_access: request?.show_ftp_access ?? request?.showFTPAccess ?? true,
    show_additional_credentials: request?.show_additional_credentials ?? request?.showAdditionalCredentials ?? true,
    send_email_notification: request?.send_email_notification ?? request?.sendEmailNotification ?? true,
    auto_renew: request?.auto_renew ?? request?.autoRenew ?? false,
    renewal_percentage: request?.renewal_percentage ?? request?.renewalPercentage ?? null,
    next_renewal_price: request?.next_renewal_price ?? request?.nextRenewalPrice ?? null,
  };
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
  // NO ACTION FKs — must be cleaned manually before delete
  await supabase.from('domain_requests').delete().eq('customer_id', id);
  await supabase.from('hosting_requests').delete().eq('customer_id', id);
  await supabase.from('requests').delete().eq('customer_id', id);
  await supabase.from('services').delete().eq('customer_id', id);
  await supabase.from('licenses').delete().eq('customer_id', id);
  // CASCADE FKs (tickets, ticket_messages, notifications, customer_*) handled by Postgres
  const { error } = await supabase.from('customers').delete().eq('id', id);
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

export const uploadProductImage = async (file) => {
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: true });
  if (error) handleSupabaseError(error, 'uploadProductImage');
  const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(data.path);
  return publicUrl;
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
  let query = supabase.from('licenses').select('*, products(name, type, description, download_url, license_type, license_registration, manual_updates, automatic_updates, category, image_url, renewal_enabled, renewal_price, renewal_date, renewal_period_days)');

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data, error } = await query;
  if (error) handleSupabaseError(error, 'getLicenses');

  return (data || []).map(l => ({
    ...l,
    name: l.products?.name || 'Unknown Product',
    product: l.products || {},
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
    .is('customer_id', null)
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
  await assertPortalActionsAllowed();
  const { data, error } = await supabase
    .from('domain_requests')
    .insert([{
      customer_id: requestData.customerId,
      domain_name: requestData.details?.domain,
      status: 'pending',
      auto_renew: requestData.details?.auto_renew ?? false,
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
  await assertPortalActionsAllowed();
  const packageLabel = requestData.details?.package || 'Hosting Request';
  const requestSummary = `${packageLabel} | Billing: ${requestData.details?.billing || 'N/A'} | Domain: ${requestData.details?.domain || 'N/A'} | Notes: ${requestData.details?.notes || 'None'}`;
  const { data, error } = await supabase
    .from('hosting_requests')
    .insert([{
      customer_id: requestData.customerId,
      package_type: requestSummary,
      status: 'pending',
      billing_period: requestData.details?.billing || null,
      domain: requestData.details?.domain || null,
      notes: requestData.details?.notes || null,
      cpanel: requestData.details?.cpanel || null,
      ftp: requestData.details?.ftp || null,
      additional_credentials: requestData.details?.additional_credentials || requestData.details?.additionalCredentials || null,
      customer_message: requestData.details?.customer_message || requestData.details?.customerMessage || null,
      show_hosting_access: requestData.details?.show_hosting_access ?? requestData.details?.showHostingAccess ?? true,
      show_ftp_access: requestData.details?.show_ftp_access ?? requestData.details?.showFTPAccess ?? true,
      show_additional_credentials: requestData.details?.show_additional_credentials ?? requestData.details?.showAdditionalCredentials ?? true,
      send_email_notification: requestData.details?.send_email_notification ?? requestData.details?.sendEmailNotification ?? true,
      auto_renew: requestData.details?.auto_renew ?? false,
      created_at: new Date().toISOString(),
      start_date: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) {
    handleSupabaseError(error, 'addHostingRequest');
  }

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
  const { customerId, productId, activationDate } = data;
  if (!customerId) {
    throw new Error('Customer is required for product assignment');
  }

  const { data: product } = await supabase
    .from('products')
    .select('name, license_type')
    .eq('id', productId)
    .single();

  let expiryDate = null;
  if (product?.license_type === 'yearly') {
    const d = new Date(activationDate || new Date());
    d.setFullYear(d.getFullYear() + 1);
    expiryDate = d.toISOString().split('T')[0];
  }

  const licenseKey = generateLicenseKey();

  const { data: license, error } = await supabase
    .from('licenses')
    .insert([{
      customer_id: customerId,
      product_id: productId,
      license_key: licenseKey,
      status: 'Active',
      expiry_date: expiryDate,
      license_type: product?.license_type || 'one_time',
      start_date: activationDate ? new Date(activationDate).toISOString() : new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) handleSupabaseError(error, 'assignProductToCustomer');

  await supabase.from('notifications').insert([{
    customer_id: customerId,
    title: 'New Product Assigned',
    message: `You have been assigned access to "${product?.name || 'a product'}". Download it from your Products page.`,
    type: 'product_assigned',
    read_status: false,
  }]);

  return license;
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

// --- Email Requests ---

export const getEmailRequests = async () => {
  const { data, error } = await supabase
    .from('email_requests')
    .select('*, customers(name, email)')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('getEmailRequests failed:', error?.message || error);
    return [];
  }
  return data || [];
};

export const getCustomerEmailRequests = async (customerId) => {
  const { data, error } = await supabase
    .from('email_requests')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('getCustomerEmailRequests failed:', error?.message || error);
    return [];
  }
  return data || [];
};

export const updateEmailRequest = async (id, updates) => {
  const { data, error } = await supabase
    .from('email_requests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) handleSupabaseError(error, 'updateEmailRequest');
  return data;
};

export const deleteEmailRequest = async (id) => {
  const { error } = await supabase
    .from('email_requests')
    .delete()
    .eq('id', id);

  if (error) handleSupabaseError(error, 'deleteEmailRequest');
  return true;
};

export const updateLicense = async (id, updates) => {
  const { data, error } = await supabase.from('licenses').update(updates).eq('id', id).select().single();
  if (error) handleSupabaseError(error, 'updateLicense');
  return data;
};

export const deleteLicense = async (id) => {
  const { error } = await supabase.from('licenses').delete().eq('id', id);
  if (error) handleSupabaseError(error, 'deleteLicense');
  return true;
};

export const incrementDownloadCount = async (licenseId) => {
  const { data: row } = await supabase.from('licenses').select('download_count').eq('id', licenseId).single();
  const next = (row?.download_count || 0) + 1;
  await supabase.from('licenses').update({ download_count: next }).eq('id', licenseId);
  return next;
};

export const generateLicenseKey = () => {
  return 'XXXX-XXXX-XXXX-XXXX'.replace(/X/g, () => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.random() * 36 | 0]);
};

export const DEFAULT_APP_SETTINGS = {
  emailRemindersEnabled: false,
  reminderDaysBefore: 15,
  adminEmail: ''
};

export const DEFAULT_PORTAL_SETTINGS = {
  customerActionsEnabled: false,
  customerActionsStartDate: '',
  customerActionsEndDate: '',
  customerActionsNote: ''
};

const PORTAL_SETTINGS_STORAGE_KEY = 'portal_settings';

const toPortalSettingsRecord = (settings = {}) => ({
  id: 1,
  customer_actions_enabled: !!settings.customerActionsEnabled,
  customer_actions_start_date: settings.customerActionsStartDate || null,
  customer_actions_end_date: settings.customerActionsEndDate || null,
  customer_actions_note: settings.customerActionsNote || '',
});

const fromPortalSettingsRecord = (record = {}) => ({
  ...DEFAULT_PORTAL_SETTINGS,
  customerActionsEnabled: !!(record.customer_actions_enabled ?? record.customerActionsEnabled),
  customerActionsStartDate: record.customer_actions_start_date ?? record.customerActionsStartDate ?? '',
  customerActionsEndDate: record.customer_actions_end_date ?? record.customerActionsEndDate ?? '',
  customerActionsNote: record.customer_actions_note ?? record.customerActionsNote ?? '',
});

export const getSettings = () => {
  const raw = localStorage.getItem('app_settings');
  if (!raw) return { ...DEFAULT_APP_SETTINGS };
  try {
    return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
};

export const saveSettings = (settings) => {
  const next = { ...DEFAULT_APP_SETTINGS, ...settings };
  console.log('Settings saved:', next);
  localStorage.setItem('app_settings', JSON.stringify(next));
  return next;
};

export const getPortalSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('portal_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) throw error;
    return fromPortalSettingsRecord(data || {});
  } catch (err) {
    console.warn('getPortalSettings: falling back to localStorage due to Supabase error', err?.message || err);
    try {
      const raw = localStorage.getItem(PORTAL_SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PORTAL_SETTINGS };
      return { ...DEFAULT_PORTAL_SETTINGS, ...JSON.parse(raw) };
    } catch (e) {
      return { ...DEFAULT_PORTAL_SETTINGS };
    }
  }
};

export const savePortalSettings = async (settings) => {
  const next = { ...DEFAULT_PORTAL_SETTINGS, ...settings };
  const record = toPortalSettingsRecord(next);
  try {
    const { error } = await supabase
      .from('portal_settings')
      .upsert(record, { onConflict: 'id' });

    if (error) throw error;
    try {
      localStorage.setItem(PORTAL_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('savePortalSettings: failed to mirror portal settings to localStorage', e?.message || e);
    }
    return next;
  } catch (err) {
    console.warn('savePortalSettings: Supabase upsert failed, saving to localStorage instead', err?.message || err);
    try {
      localStorage.setItem(PORTAL_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('savePortalSettings: failed to save to localStorage', e?.message || e);
    }
    return next;
  }
};

export const getPortalActionBlock = (settings = DEFAULT_PORTAL_SETTINGS, now = new Date()) => {
  if (!settings?.customerActionsEnabled) return null;

  const startDate = settings.customerActionsStartDate ? new Date(settings.customerActionsStartDate) : null;
  const endDate = settings.customerActionsEndDate ? new Date(settings.customerActionsEndDate) : null;
  const currentTime = now.getTime();

  if (startDate && !Number.isNaN(startDate.getTime()) && currentTime < startDate.getTime()) return null;
  if (endDate && !Number.isNaN(endDate.getTime()) && currentTime > endDate.getTime()) return null;

  return {
    message: settings.customerActionsNote?.trim() || 'Customer requests and payments are temporarily paused by the administrator.',
    startDate: settings.customerActionsStartDate || '',
    endDate: settings.customerActionsEndDate || '',
  };
};

export const getPortalRestrictionStatus = async () => {
  const settings = await getPortalSettings();
  const block = getPortalActionBlock(settings);
  return { settings, block, blocked: !!block };
};

export const assertPortalActionsAllowed = async () => {
  const { block } = await getPortalRestrictionStatus();
  if (block) {
    const error = new Error(block.message);
    error.code = 'PORTAL_ACTIONS_PAUSED';
    throw error;
  }
};

// ── Ticket Functions ──────────────────────────────────────────

export const createTicket = async (customerId, subject, priority = 'normal') => {
  await assertPortalActionsAllowed();
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

export const reopenTicket = async (ticketId) => {
  const { error } = await supabase
    .from('tickets')
    .update({ status: 'open', updated_at: new Date().toISOString() })
    .eq('id', ticketId);
  if (error) handleSupabaseError(error, 'reopenTicket');
  return true;
};

export const deleteTicket = async (ticketId) => {
  // Delete messages first (child rows), then the ticket
  await supabase.from('ticket_messages').delete().eq('ticket_id', ticketId);
  const { error } = await supabase
    .from('tickets')
    .delete()
    .eq('id', ticketId);
  if (error) handleSupabaseError(error, 'deleteTicket');
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
// ── Admin Assign Functions ──────────────────────────────────────

export const assignDomainToCustomer = async (data) => {
  const { customerId, domainName, registrationPeriod, expiryDate, notes, price, startDate } = data;
  const { data: record, error } = await supabase
    .from('domain_requests')
    .insert([{
      customer_id: customerId,
      domain_name: domainName,
      status: 'approved',
      registration_period: parseInt(registrationPeriod) || 1,
      expiry_date: expiryDate || null,
      notes: notes || null,
      price: price || null,
      created_at: new Date().toISOString(),
      start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) handleSupabaseError(error, 'assignDomainToCustomer');

  // Notify customer
  await supabase.from('notifications').insert([{
    customer_id: customerId,
    type: 'update',
    title: 'Domain Assigned',
    message: `Domain "${domainName}" has been assigned to your account (${registrationPeriod} yr).`,
    read_status: false,
  }]);

  // Log in activity log
  await supabase.from('notifications').insert([{
    customer_id: null,
    type: 'admin_activity',
    title: `Domain Assigned — ${domainName}`,
    message: `Admin assigned domain "${domainName}" (${registrationPeriod} yr) directly to customer.`,
  }]);

  return record;
};

export const assignHostingToCustomer = async (data) => {
  const {
    customerId,
    hostingType,
    planName,
    billingPeriod,
    domain,
    notes,
    price,
    autoRenew,
    renewalPercentage,
    nextRenewalPrice,
    startDate,
    diskUsageLimit,
    bandwidthLimit,
    cpanel,
    ftp,
    additionalCredentials,
    customerMessage,
    showHostingAccess,
    showFTPAccess,
    showAdditionalCredentials,
    sendEmailNotification,
  } = data;
  const packageSummary = `${hostingType} - ${planName} | Billing: ${billingPeriod} | Domain: ${domain || 'N/A'} | Notes: ${notes || 'None'}`;

  // Calculate expiry based on billing period
  let expiryDate = null;
  if (billingPeriod) {
    const d = new Date();
    const b = String(billingPeriod).toLowerCase();
    if (b.includes('yearly') || b.includes('annual') || b.includes('12')) d.setFullYear(d.getFullYear() + 1);
    else if (b.includes('6') || b.includes('semi')) d.setMonth(d.getMonth() + 6);
    else if (b.includes('3') || b.includes('quarter')) d.setMonth(d.getMonth() + 3);
    else if (b.includes('2') && !b.includes('month')) d.setFullYear(d.getFullYear() + 2);
    else d.setMonth(d.getMonth() + 1);
    expiryDate = d.toISOString();
  }

  const diskLimit = diskUsageLimit && diskUsageLimit.trim() ? diskUsageLimit.trim() : null;
  const bwLimit = bandwidthLimit && bandwidthLimit.trim() ? bandwidthLimit.trim() : null;

  // If admin didn't override allocated resources, pull defaults from hosting plans
  let finalDiskLimit = diskLimit;
  let finalBwLimit = bwLimit;
  if (!finalDiskLimit || !finalBwLimit) {
    try {
      const planLimits = await getHostingPlanLimits(hostingType, planName);
      finalDiskLimit = finalDiskLimit || planLimits.disk_usage_limit || null;
      finalBwLimit = finalBwLimit || planLimits.bandwidth_limit || null;
    } catch (e) {
      // ignore and leave limits as-is
    }
  }

  const { data: record, error } = await supabase
    .from('hosting_requests')
    .insert([{
      customer_id: customerId,
      package_type: packageSummary,
      hosting_type: hostingType,
      plan_name: planName,
      billing_period: billingPeriod,
      domain: domain || null,
      status: 'approved',
      expiry_date: expiryDate,
      notes: notes || null,
      price: price || null,
      disk_usage_limit: finalDiskLimit,
      bandwidth_limit: finalBwLimit,
      cpanel: cpanel || null,
      ftp: ftp || null,
      additional_credentials: additionalCredentials || null,
      customer_message: customerMessage || null,
      show_hosting_access: showHostingAccess ?? true,
      show_ftp_access: showFTPAccess ?? true,
      show_additional_credentials: showAdditionalCredentials ?? true,
      send_email_notification: sendEmailNotification ?? true,
      auto_renew: autoRenew ?? false,
      renewal_percentage: renewalPercentage || null,
      next_renewal_price: nextRenewalPrice || null,
      created_at: new Date().toISOString(),
      start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) handleSupabaseError(error, 'assignHostingToCustomer');

  // Notify customer
  await supabase.from('notifications').insert([{
    customer_id: customerId,
    type: 'update',
    title: 'Hosting Package Assigned',
    message: customerMessage ? customerMessage : `Hosting package "${hostingType} - ${planName}" (${billingPeriod}) has been assigned to your account.`,
    read_status: false,
  }]);

  // Log in activity log
  await supabase.from('notifications').insert([{
    customer_id: null,
    type: 'admin_activity',
    title: `Hosting Assigned — ${hostingType} ${planName}`,
    message: `Admin assigned hosting "${hostingType} - ${planName}" (${billingPeriod}) directly to customer.`,
  }]);

  return record;
};

export const assignEmailToCustomer = async (data) => {
  const { customerId, email, registrationPeriod, expiryDate, notes, price, startDate, emailUsername, emailPassword } = data;
  const { data: record, error } = await supabase
    .from('email_requests')
    .insert([{
      customer_id: customerId,
      email,
      status: 'approved',
      registration_period: parseInt(registrationPeriod) || 1,
      expiry_date: expiryDate || null,
      notes: notes || null,
      price: price || null,
      email_username: emailUsername || null,
      email_password: emailPassword || null,
      created_at: new Date().toISOString(),
      start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) handleSupabaseError(error, 'assignEmailToCustomer');

  // Notify customer
  await supabase.from('notifications').insert([{
    customer_id: customerId,
    type: 'update',
    title: 'Email Assigned',
    message: `Email "${email}" has been assigned to your account (${registrationPeriod} yr).`,
    read_status: false,
  }]);

  // Log in activity log
  await supabase.from('notifications').insert([{
    customer_id: null,
    type: 'admin_activity',
    title: `Email Assigned — ${email}`,
    message: `Admin assigned email "${email}" (${registrationPeriod} yr) directly to customer.`,
  }]);

  return record;
};
