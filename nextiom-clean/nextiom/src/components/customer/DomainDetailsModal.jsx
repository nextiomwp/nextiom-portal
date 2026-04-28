import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

function DomainDetailsModal({ domain, isOpen, onClose }) {
  if (!domain) return null;

  const getStatusColor = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'active' || s === 'registered') return 'bg-green-100 text-green-700';
    if (s === 'expired') return 'bg-red-100 text-red-700';
    if (s.includes('pending')) return 'bg-yellow-100 text-yellow-700';
    if (s === 'completed') return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-700';
  };

  const formatDate = (val) => {
    if (!val) return 'N/A';
    const d = new Date(val);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  const rows = [
    { label: 'Domain Name', value: domain.name || domain.domain_name || 'N/A' },
    { label: 'Status', value: domain.status || 'N/A' },
    { label: 'Registration Period', value: domain.registration_period ? `${domain.registration_period} Year${domain.registration_period !== 1 ? 's' : ''}` : 'N/A' },
    { label: 'Registered On', value: formatDate(domain.created_at) },
    { label: 'Expiry Date', value: formatDate(domain.expiry_date || domain.expiryDate) },
    { label: 'Auto Renew', value: (domain.auto_renew ?? domain.autoRenew) ? 'Enabled' : 'Disabled' },
    { label: 'Notes', value: domain.notes || '—' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex justify-between items-center pr-4">
            <div>
              <DialogTitle className="text-xl font-bold">{domain.name || domain.domain_name}</DialogTitle>
              <DialogDescription>Domain details</DialogDescription>
            </div>
            <Badge className={getStatusColor(domain.status)}>{domain.status}</Badge>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-0 divide-y divide-slate-100">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex justify-between py-3 text-sm">
              <span className="text-slate-500 font-medium">{label}</span>
              <span className="text-slate-800 font-semibold text-right max-w-[60%]">{value}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DomainDetailsModal;
