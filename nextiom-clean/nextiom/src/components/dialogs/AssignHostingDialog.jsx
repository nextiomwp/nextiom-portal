import React, { useState, useEffect } from 'react';
import { Server, Loader2, Check, DollarSign, HardDrive, Wifi } from 'lucide-react';
import { assignHostingToCustomer, getHostingPlans, updateHostingRequest, parseHostingPackageSummary, addNotification } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const parseJson = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const buildPackageSummary = ({ hostingType, planName, billingPeriod, domain, notes }) =>
  `${hostingType} - ${planName} | Billing: ${billingPeriod} | Domain: ${domain || 'N/A'} | Notes: ${notes || 'None'}`;

function AssignHostingDialog({ open, onClose, customer, c, onSuccess, request, footerContent, isEditMode = false }) {
  const [plans, setPlans] = useState([]);
  const [hostingType, setHostingType] = useState('');
  const [planName, setPlanName] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('Monthly');
  const [domain, setDomain] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('LKR');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [diskUsageLimit, setDiskUsageLimit] = useState('');
  const [bandwidthLimit, setBandwidthLimit] = useState('');
  const [enableResourceOverride, setEnableResourceOverride] = useState(false);
  const [cpanelUrl, setCpanelUrl] = useState('');
  const [cpanelUsername, setCpanelUsername] = useState('');
  const [cpanelPassword, setCpanelPassword] = useState('');
  const [cpanelNotes, setCpanelNotes] = useState('');
  const [ftpHost, setFtpHost] = useState('');
  const [ftpUsername, setFtpUsername] = useState('');
  const [ftpPassword, setFtpPassword] = useState('');
  const [additionalCredentials, setAdditionalCredentials] = useState([]);
  const [autoRenew, setAutoRenew] = useState(false);
  const [renewalPercentage, setRenewalPercentage] = useState('');
  const [nextRenewalPrice, setNextRenewalPrice] = useState('');
  const [customerMessage, setCustomerMessage] = useState('Your hosting account has been activated successfully. Login details are available above. Please keep your credentials secure.');
  const [showHostingAccess, setShowHostingAccess] = useState(true);
  const [showFTPAccess, setShowFTPAccess] = useState(true);
  const [showAdditionalCredentials, setShowAdditionalCredentials] = useState(true);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('approved');
  const [expiryDate, setExpiryDate] = useState('');
  const [adminReply, setAdminReply] = useState('');
  const { toast } = useToast();
  const isRequestMode = !!request;


  useEffect(() => {
    if (open) {
      getHostingPlans().then(data => setPlans(data || [])).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (request) {
      const parsed = parseHostingPackageSummary(request.package_type || '');
      const cpanelInfo = parseJson(request.cpanel) || {};
      const ftpInfo = parseJson(request.ftp) || {};
      const creds = Array.isArray(request.additional_credentials)
        ? request.additional_credentials
        : parseJson(request.additional_credentials) || [];

      setHostingType(request.hosting_type || parsed.hostingType || '');
      setPlanName(request.plan_name || parsed.planName || '');
      setBillingPeriod(request.billing_period || parsed.billingPeriod || 'Monthly');
      setDomain(request.domain || parsed.domain || '');
      setPrice(request.price != null ? String(request.price) : '');
      setCurrency(request.currency || 'LKR');
      setNotes(request.notes || parsed.notes || '');
      setStartDate(request.start_date ? new Date(request.start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setDiskUsageLimit(request.disk_usage_limit || '');
      setBandwidthLimit(request.bandwidth_limit || '');
      setEnableResourceOverride(Boolean(request.disk_usage_limit || request.bandwidth_limit));
      setCpanelUrl(cpanelInfo.url || '');
      setCpanelUsername(cpanelInfo.username || '');
      setCpanelPassword(cpanelInfo.password || '');
      setCpanelNotes(cpanelInfo.notes || '');
      setFtpHost(ftpInfo.host || '');
      setFtpUsername(ftpInfo.username || '');
      setFtpPassword(ftpInfo.password || '');
      setAdditionalCredentials(creds);
      setAutoRenew(request.auto_renew ?? request.autoRenew ?? false);
      setRenewalPercentage(request.renewal_percentage ?? request.renewalPercentage ?? '');
      setNextRenewalPrice(request.next_renewal_price ?? request.nextRenewalPrice ?? '');
      setCustomerMessage(request.customer_message ?? request.customerMessage ?? 'Your hosting account has been activated successfully. Login details are available above. Please keep your credentials secure.');
      setShowHostingAccess(request.show_hosting_access ?? request.showHostingAccess ?? true);
      setShowFTPAccess(request.show_ftp_access ?? request.showFTPAccess ?? true);
      setShowAdditionalCredentials(request.show_additional_credentials ?? request.showAdditionalCredentials ?? true);
      setSendEmailNotification(request.send_email_notification ?? request.sendEmailNotification ?? true);
      setStatus(request.status || 'approved');
      setExpiryDate(request.expiry_date ? new Date(request.expiry_date).toISOString().split('T')[0] : '');
      setAdminReply(request.admin_reply || '');
    } else {
      setHostingType('');
      setPlanName('');
      setBillingPeriod('Monthly');
      setDomain('');
      setPrice('');
      setCurrency('LKR');
      setNotes('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setDiskUsageLimit('');
      setBandwidthLimit('');
      setEnableResourceOverride(false);
      setCpanelUrl('');
      setCpanelUsername('');
      setCpanelPassword('');
      setCpanelNotes('');
      setFtpHost('');
      setFtpUsername('');
      setFtpPassword('');
      setAdditionalCredentials([]);
      setAutoRenew(false);
      setRenewalPercentage('');
      setNextRenewalPrice('');
      setCustomerMessage('Your hosting account has been activated successfully. Login details are available above. Please keep your credentials secure.');
      setShowHostingAccess(true);
      setShowFTPAccess(true);
      setShowAdditionalCredentials(true);
      setSendEmailNotification(true);
      setStatus('approved');
      setExpiryDate('');
      setAdminReply('');
    }
  }, [open, request]);

  // Calculate next renewal price when autoRenew is enabled and price/percentage changes
  useEffect(() => {
    if (autoRenew && price && renewalPercentage) {
      const p = parseFloat(price) || 0;
      const perc = parseFloat(renewalPercentage) || 0;
      const calculated = p * (1 + perc / 100);
      setNextRenewalPrice(calculated.toFixed(2));
    } else if (!autoRenew) {
      setNextRenewalPrice('');
    }
  }, [autoRenew, price, renewalPercentage]);

  if (!open) return null;

  // Detect dark mode from the theme object's bg color
  const isDark = c?.bg && (c.bg.includes('#15') || c.bg.includes('#1') || c.bg.includes('15161'));
  
  // Use exact admin theme values or sensible defaults
  const text = c?.text || (isDark ? '#fff' : '#1a1a1a');
  const subText = c?.subText || (isDark ? '#a0a0a0' : '#888');
  const brand = c?.brand || 'var(--brand-color)';
  const border = c?.border || (isDark ? 'rgba(255,255,255,0.06)' : '#ebebeb');
  const bgColor = c?.card || (isDark ? '#1C1E24' : '#fff');
  const sectionBg = isDark ? '#2a2d35' : '#f8f8f7';
  const inputBg = isDark ? '#1a1d24' : '#f5f5f5';
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  const fieldClass = 'w-full mt-1.5 px-3 py-2 h-10 leading-tight rounded-xl outline-none transition-all border focus:ring-2 focus:ring-[var(--brand-color)]/30 focus:border-[var(--brand-color)]';
  const fieldStyle = {
    background: inputBg,
    color: text,
    border: `1px solid ${inputBorder}`,
    boxSizing: 'border-box',
  };
  const disabledFieldStyle = {
    ...fieldStyle,
    background: isDark ? '#11161d' : '#e7e9ee',
    color: isDark ? '#64748b' : '#6b7280',
    cursor: 'not-allowed',
  };
  const textareaStyle = {
    ...fieldStyle,
    minHeight: 90,
    resize: 'vertical',
  };
  const sectionStyle = {
    padding: 18,
    border: `1px solid ${border}`,
    borderRadius: 18,
    background: sectionBg,
  };
  const labelS = {
    fontSize: 12, fontWeight: 600, color: subText,
    textTransform: 'uppercase', letterSpacing: 0.8,
    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8
  };

  const hostingTypes = [...new Set(plans.map(p => p.hosting_type))];
  if (isRequestMode && hostingType && !hostingTypes.includes(hostingType)) {
    hostingTypes.unshift(hostingType);
  }
  const selectedPlans = hostingType ? plans.filter(p => p.hosting_type === hostingType && p.is_active !== false) : [];
  if (isRequestMode && hostingType && planName && !selectedPlans.find(p => p.plan_name === planName)) {
    selectedPlans.unshift({ id: 'requested-plan', hosting_type: hostingType, plan_name: planName, storage: diskUsageLimit, bandwidth: bandwidthLimit });
  }
  const selectedPlan = !planName || !hostingType ? null : plans.find(p => p.hosting_type === hostingType && p.plan_name === planName) || selectedPlans[0] || null;
  const planDisk = selectedPlan?.storage || '';
  const planBw = selectedPlan?.bandwidth || '';

  const handlePlanChange = (val) => {
    setPlanName(val);
    const plan = plans.find(p => p.hosting_type === hostingType && p.plan_name === val);
    if (plan) {
      if (!enableResourceOverride) {
        setDiskUsageLimit(plan.storage || '');
        setBandwidthLimit(plan.bandwidth || '');
      }
      if (plan.renewal_percentage != null) {
        setRenewalPercentage(String(plan.renewal_percentage));
      }
      if (plan.price_monthly != null) {
        let calculatedPrice = plan.price_monthly;
        if (billingPeriod === 'Yearly') {
          const discount = plan.discount_yearly || 0;
          calculatedPrice = plan.price_monthly * (1 - discount / 100);
        } else if (billingPeriod === '2 Years') {
          const discount = plan.discount_2years || 0;
          calculatedPrice = plan.price_monthly * (1 - discount / 100);
        }
        setPrice(calculatedPrice.toFixed(2));
      }
    }
  };

  const handleSubmit = async () => {
    if (!hostingType) {
      toast({ title: 'Error', description: 'Please select a hosting type', variant: 'destructive' });
      return;
    }
    if (!planName) {
      toast({ title: 'Error', description: 'Please select a plan', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const finalPrice = parseFloat(price) > 0 ? parseFloat(price) : null;
      const payload = {
        package_type: buildPackageSummary({ hostingType, planName, billingPeriod, domain, notes }),
        hosting_type: hostingType,
        plan_name: planName,
        billing_period: billingPeriod,
        domain: domain.trim() || null,
        notes: notes.trim() || null,
        price: finalPrice,
        currency: currency,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        disk_usage_limit: enableResourceOverride ? diskUsageLimit.trim() || null : null,
        bandwidth_limit: enableResourceOverride ? bandwidthLimit.trim() || null : null,
        cpanel: {
          url: cpanelUrl.trim() || null,
          username: cpanelUsername.trim() || null,
          password: cpanelPassword.trim() || null,
          notes: cpanelNotes.trim() || null,
        },
        ftp: {
          host: ftpHost.trim() || null,
          username: ftpUsername.trim() || null,
          password: ftpPassword.trim() || null,
        },
        auto_renew: autoRenew,
        renewal_percentage: parseFloat(renewalPercentage) > 0 ? parseFloat(renewalPercentage) : null,
        next_renewal_price: parseFloat(nextRenewalPrice) > 0 ? parseFloat(nextRenewalPrice) : null,
        additional_credentials: additionalCredentials.filter(cred => cred.type || cred.url || cred.username || cred.password),
        customer_message: customerMessage.trim(),
        show_hosting_access: showHostingAccess,
        show_ftp_access: showFTPAccess,
        show_additional_credentials: showAdditionalCredentials,
        send_email_notification: sendEmailNotification,
      };

      if (isEditMode) {
        payload.status = status;
        payload.expiry_date = expiryDate ? new Date(expiryDate).toISOString() : null;
        payload.admin_reply = adminReply;

        await updateHostingRequest(request.id, payload);
        const label = `${hostingType} — ${planName}`;
        addNotification({
          customer_id: null,
          type: 'request_updated',
          title: `Hosting Updated — ${label}`,
          message: `Admin updated hosting record for ${label} (status: ${status}).`
        }).catch(() => {});
        toast({ title: 'Hosting Updated', description: 'Changes saved successfully.' });
      } else {
        if (isRequestMode) {
          await updateHostingRequest(request.id, payload);
          toast({ title: 'Request Updated', description: `${hostingType} - ${planName} request updated for ${customer?.name || 'customer'}` });
        }

        await assignHostingToCustomer({
          customerId: customer.id,
          hostingType,
          planName,
          billingPeriod,
          domain: domain.trim() || null,
          notes: notes.trim() || null,
          price: finalPrice,
          currency,
          startDate,
          diskUsageLimit: enableResourceOverride ? diskUsageLimit.trim() || null : null,
          bandwidthLimit: enableResourceOverride ? bandwidthLimit.trim() || null : null,
          cpanel: payload.cpanel,
          ftp: payload.ftp,
          autoRenew,
          renewalPercentage: payload.renewal_percentage,
          nextRenewalPrice: payload.next_renewal_price,
          additionalCredentials: payload.additional_credentials,
          customerMessage: payload.customer_message,
          showHostingAccess: payload.show_hosting_access,
          showFTPAccess: payload.show_ftp_access,
          showAdditionalCredentials: payload.show_additional_credentials,
          sendEmailNotification: payload.send_email_notification,
        });

        try {
          const { shouldSendPurchaseSms, sendPurchaseSms } = await import('@/lib/sms');
          if (await shouldSendPurchaseSms()) {
            if (customer?.phone) {
              await sendPurchaseSms({
                phone: customer.phone,
                customerName: customer.name || 'Valued Customer',
                serviceLabel: `hosting plan "${planName}"`,
                customerId: customer.id
              });
            }
          }
        } catch (smsErr) {
          console.error('Failed to send hosting assign SMS:', smsErr);
        }

        toast({ title: 'Hosting Assigned', description: `${hostingType} - ${planName} assigned to ${customer.name}` });
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      toast({ title: 'Error', description: err?.message || (isEditMode ? 'Failed to update hosting' : isRequestMode ? 'Failed to update request' : 'Failed to assign hosting'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose?.(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" style={{ background: bgColor, color: text, display: 'flex', flexDirection: 'column' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3" style={{ color: text }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <Server size={16} />
            </span>
            <span>
              {isEditMode ? 'Edit Hosting' : isRequestMode ? 'Review Hosting Request' : 'Assign Hosting'}
              <div className="mt-1 text-xs font-normal" style={{ color: subText }}>{customer?.name} — {customer?.email}</div>
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEditMode ? 'Edit hosting package, billing details, control panel and FTP credentials, and additional access details.' : 'Assign a hosting package, billing period, control panel and FTP credentials, and additional access details.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4" style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', minHeight: 0 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={labelS}>Hosting Type *</label>
              <select className={fieldClass} style={fieldStyle} value={hostingType} onChange={e => { setHostingType(e.target.value); setPlanName(''); }} disabled={isRequestMode && !isEditMode}>
                <option value="">Select hosting type…</option>
                {hostingTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelS}>Plan *</label>
              <select className={fieldClass} style={fieldStyle} value={planName} onChange={e => handlePlanChange(e.target.value)} disabled={(isRequestMode && !isEditMode) || !hostingType}>
                <option value="">{hostingType ? 'Select a plan…' : 'Choose a type first…'}</option>
                {selectedPlans.map(p => (
                  <option key={p.id} value={p.plan_name}>
                    {p.plan_name}{p.storage ? ` (${p.storage}` : ''}{p.storage && p.bandwidth ? ' / ' : ''}{p.bandwidth ? `${p.bandwidth})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {isEditMode && (
              <>
                <div>
                  <label style={labelS}>Status</label>
                  <select className={fieldClass} style={fieldStyle} value={status} onChange={e => setStatus(e.target.value)}>
                    {['pending', 'approved', 'active', 'expired', 'suspended', 'rejected'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelS}>Expiry Date</label>
                  <input className={fieldClass} style={fieldStyle} type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 }}>
                <label style={labelS}>Override plan disk & bandwidth limits</label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: subText, fontWeight: 600 }}>
                  <input type="checkbox" checked={enableResourceOverride} onChange={e => setEnableResourceOverride(e.target.checked)} style={{ accentColor: brand }} />
                  Enable custom values
                </label>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label style={labelS}>Disk Usage Limit</label>
                  <input className={fieldClass} style={enableResourceOverride ? fieldStyle : disabledFieldStyle} type="text" placeholder={planDisk ? `Plan default: ${planDisk}` : 'e.g. 100 GB'} value={diskUsageLimit} onChange={e => setDiskUsageLimit(e.target.value)} disabled={!enableResourceOverride} />
                </div>
                <div>
                  <label style={labelS}>Bandwidth Limit</label>
                  <input className={fieldClass} style={enableResourceOverride ? fieldStyle : disabledFieldStyle} type="text" placeholder={planBw ? `Plan default: ${planBw}` : 'e.g. 1 TB'} value={bandwidthLimit} onChange={e => setBandwidthLimit(e.target.value)} disabled={!enableResourceOverride} />
                </div>
              </div>
            </div>
             <div>
              <label style={labelS}>Billing Period</label>
              <select className={fieldClass} style={fieldStyle} value={billingPeriod} onChange={e => {
                const nextPeriod = e.target.value;
                setBillingPeriod(nextPeriod);
                const plan = plans.find(p => p.hosting_type === hostingType && p.plan_name === planName);
                if (plan && plan.price_monthly != null) {
                  let calculatedPrice = plan.price_monthly;
                  if (nextPeriod === 'Yearly') {
                    const discount = plan.discount_yearly || 0;
                    calculatedPrice = plan.price_monthly * (1 - discount / 100);
                  } else if (nextPeriod === '2 Years') {
                    const discount = plan.discount_2years || 0;
                    calculatedPrice = plan.price_monthly * (1 - discount / 100);
                  }
                  setPrice(calculatedPrice.toFixed(2));
                }
              }} disabled={isRequestMode && !isEditMode}>
                {['Monthly', 'Quarterly (3mo)', 'Semi-Annual (6mo)', 'Yearly', '2 Years'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={labelS}>Start Date</label>
              <input className={fieldClass} style={fieldStyle} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={labelS}>Domain (optional)</label>
              <input className={fieldClass} style={fieldStyle} value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g. example.com" disabled={isRequestMode && !isEditMode} />
            </div>
            <div>
              <label style={labelS}>Auto Renew</label>
              <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: text, cursor: (isRequestMode && !isEditMode) ? 'not-allowed' : 'pointer', padding: '6px 14px', borderRadius: 10, border: `1.5px solid ${autoRenew ? brand : border}`, background: autoRenew ? `${brand}15` : 'transparent', fontWeight: autoRenew ? 600 : 400 }}>
                  <input type="radio" name="autoRenew" checked={autoRenew} onChange={() => !(isRequestMode && !isEditMode) && setAutoRenew(true)} style={{ accentColor: brand }} disabled={isRequestMode && !isEditMode} />
                  YES
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: text, cursor: (isRequestMode && !isEditMode) ? 'not-allowed' : 'pointer', padding: '6px 14px', borderRadius: 10, border: `1.5px solid ${!autoRenew ? brand : border}`, background: !autoRenew ? `${brand}15` : 'transparent', fontWeight: !autoRenew ? 600 : 400 }}>
                  <input type="radio" name="autoRenew" checked={!autoRenew} onChange={() => !(isRequestMode && !isEditMode) && setAutoRenew(false)} style={{ accentColor: brand }} disabled={isRequestMode && !isEditMode} />
                  NO
                </label>
              </div>
            </div>
          </div>

          {autoRenew && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label style={labelS}>Renewal Percentage (%)</label>
                <input className={fieldClass} style={fieldStyle} type="number" min="0" max="100" step="0.1" placeholder="e.g. 10" value={renewalPercentage} onChange={e => setRenewalPercentage(e.target.value)} />
              </div>
              <div>
                <label style={labelS}>Currency</label>
                <select className={fieldClass} style={fieldStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="LKR">LKR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label style={labelS}>Price (optional)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: subText, fontSize: 13, fontWeight: 600 }}>
                    {currency === 'USD' ? '$' : 'Rs.'}
                  </span>
                  <input className={`${fieldClass} ${currency === 'USD' ? 'pl-8' : 'pl-11'}`} style={fieldStyle} type="number" min="0" step="0.01" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelS}>Next Renewal Price</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: subText, fontSize: 13, fontWeight: 600 }}>
                    {currency === 'USD' ? '$' : 'Rs.'}
                  </span>
                  <input className={`${fieldClass} ${currency === 'USD' ? 'pl-8' : 'pl-11'}`} style={{ ...disabledFieldStyle }} type="text" readOnly value={nextRenewalPrice ? `${currency} ${parseFloat(nextRenewalPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'} />
                </div>
                {price && renewalPercentage && nextRenewalPrice && (
                  <div style={{ fontSize: 11, color: subText, marginTop: 4, textAlign: 'right' }}>
                    = {parseFloat(price).toLocaleString(undefined, { minimumFractionDigits: 2 })} + ({renewalPercentage}%)
                  </div>
                )}
              </div>
            </div>
          )}

          {!autoRenew && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label style={labelS}>Currency</label>
                <select className={fieldClass} style={fieldStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="LKR">LKR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label style={labelS}>Price (optional)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: subText, fontSize: 13, fontWeight: 600 }}>
                    {currency === 'USD' ? '$' : 'Rs.'}
                  </span>
                  <input className={`${fieldClass} ${currency === 'USD' ? 'pl-8' : 'pl-11'}`} style={fieldStyle} type="number" min="0" step="0.01" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <section style={sectionStyle}>
            <div style={{ marginBottom: 12, fontWeight: 700, color: text }}>Hosting / Control Panel Access</div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label style={labelS}>Login URL</label>
                <input className={fieldClass} style={fieldStyle} value={cpanelUrl} onChange={e => setCpanelUrl(e.target.value)} placeholder="https://cpanel.example.com" />
              </div>
              <div>
                <label style={labelS}>Username</label>
                <input className={fieldClass} style={fieldStyle} value={cpanelUsername} onChange={e => setCpanelUsername(e.target.value)} placeholder="cpanel_user" />
              </div>
              <div>
                <label style={labelS}>Password</label>
                <input className={fieldClass} style={fieldStyle} type="password" value={cpanelPassword} onChange={e => setCpanelPassword(e.target.value)} placeholder="********" />
              </div>
              <div className="lg:col-span-3">
                <label style={labelS}>Notes (optional)</label>
                <textarea className={`${fieldClass} min-h-[90px] resize-y`} style={textareaStyle} value={cpanelNotes} onChange={e => setCpanelNotes(e.target.value)} placeholder="Main cPanel access for managing hosting account." />
              </div>
            </div>
          </section>

          <section style={sectionStyle}>
            <div style={{ marginBottom: 12, fontWeight: 700, color: text }}>FTP Access</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label style={labelS}>FTP Host</label>
                <input className={fieldClass} style={fieldStyle} value={ftpHost} onChange={e => setFtpHost(e.target.value)} placeholder="ftp.example.com" />
              </div>
              <div>
                <label style={labelS}>FTP Username</label>
                <input className={fieldClass} style={fieldStyle} value={ftpUsername} onChange={e => setFtpUsername(e.target.value)} placeholder="ftp_user" />
              </div>
              <div>
                <label style={labelS}>FTP Password</label>
                <input className={fieldClass} style={fieldStyle} type="password" value={ftpPassword} onChange={e => setFtpPassword(e.target.value)} placeholder="********" />
              </div>
            </div>
          </section>

          <section style={sectionStyle}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ fontWeight: 700, color: text }}>Additional Credentials (Optional)</div>
              <button type="button" onClick={() => setAdditionalCredentials(prev => [...prev, { type: '', url: '', username: '', password: '' }])} style={{ border: `1px solid ${border}`, background: bgColor, color: text, borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                + Add Credential
              </button>
            </div>
            {additionalCredentials.length > 0 ? additionalCredentials.map((cred, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 12, padding: 14, border: `1px solid ${border}`, borderRadius: 14, background: inputBg }}>
                <div>
                  <label style={labelS}>Credential Type</label>
                  <input className={fieldClass} style={fieldStyle} value={cred.type} onChange={e => {
                    const next = [...additionalCredentials];
                    next[idx] = { ...next[idx], type: e.target.value };
                    setAdditionalCredentials(next);
                  }} placeholder="WordPress Admin" />
                </div>
                <div>
                  <label style={labelS}>URL / Host</label>
                  <input className={fieldClass} style={fieldStyle} value={cred.url} onChange={e => {
                    const next = [...additionalCredentials];
                    next[idx] = { ...next[idx], url: e.target.value };
                    setAdditionalCredentials(next);
                  }} placeholder="https://example.com/wp-admin" />
                </div>
                <div>
                  <label style={labelS}>Username</label>
                  <input className={fieldClass} style={fieldStyle} value={cred.username} onChange={e => {
                    const next = [...additionalCredentials];
                    next[idx] = { ...next[idx], username: e.target.value };
                    setAdditionalCredentials(next);
                  }} placeholder="wp_admin" />
                </div>
                <div style={{ position: 'relative' }}>
                  <label style={labelS}>Password</label>
                  <input className={fieldClass} style={fieldStyle} type="password" value={cred.password} onChange={e => {
                    const next = [...additionalCredentials];
                    next[idx] = { ...next[idx], password: e.target.value };
                    setAdditionalCredentials(next);
                  }} placeholder="********" />
                  <button type="button" onClick={() => setAdditionalCredentials(prev => prev.filter((_, index) => index !== idx))} style={{ position: 'absolute', right: 10, top: 36, border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>
                    ×
                  </button>
                </div>
              </div>
            )) : (
              <p style={{ color: subText, fontSize: 13 }}>Add additional login details for plugins, admin panels, or service portals.</p>
            )}
          </section>

          {isEditMode && (
            <section style={sectionStyle}>
              <div style={{ marginBottom: 12, fontWeight: 700, color: text }}>Admin Reply / Notes</div>
              <textarea className={`${fieldClass} min-h-[90px] resize-y`} style={textareaStyle} value={adminReply} onChange={e => setAdminReply(e.target.value)} placeholder="Enter admin notes or reply here..." />
            </section>
          )}

          <section style={sectionStyle}>
            <div style={{ marginBottom: 12, fontWeight: 700, color: text }}>Customer Message</div>
            <textarea className={`${fieldClass} min-h-[110px] resize-y`} style={textareaStyle} value={customerMessage} onChange={e => setCustomerMessage(e.target.value)} placeholder="This message will be visible to the customer." />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, gap: 10, flexWrap: 'wrap' }}>
              <span style={{ color: subText, fontSize: 12 }}>{customerMessage.length}/500</span>
            </div>
          </section>

          <section style={sectionStyle}>
            <div style={{ marginBottom: 12, fontWeight: 700, color: text }}>Visibility Settings</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: 'Show Hosting Access', checked: showHostingAccess, setter: setShowHostingAccess },
                { label: 'Show FTP Access', checked: showFTPAccess, setter: setShowFTPAccess },
                { label: 'Show Additional Credentials', checked: showAdditionalCredentials, setter: setShowAdditionalCredentials },
                { label: 'Send Email Notification to Customer', checked: sendEmailNotification, setter: setSendEmailNotification },
              ].map(item => (
                <label key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: bgColor, padding: '11px 14px', borderRadius: 12, border: `1px solid ${border}`, color: text, cursor: 'pointer' }}>
                  <input type="checkbox" checked={item.checked} onChange={() => item.setter(prev => !prev)} style={{ accentColor: brand }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>
                </label>
              ))}
            </div>
          </section>
          {footerContent}
        </div>

        <div style={{ padding: '16px 24px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0, marginTop: 'auto' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: `1.5px solid ${border}`, background: 'transparent', color: text, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 8, border: 'none', background: brand, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? (isEditMode ? 'Saving…' : isRequestMode ? 'Updating…' : 'Assigning…') : (isEditMode ? 'Save Changes' : isRequestMode ? 'Update Request' : 'Assign Hosting')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AssignHostingDialog;
