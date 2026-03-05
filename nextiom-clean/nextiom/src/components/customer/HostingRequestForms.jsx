import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { addHostingRequest, REQUEST_TYPE, HOSTING_PLANS } from '@/lib/storage';

const BaseHostingForm = ({ pkg, onSubmit, children, title, buttonText = "Submit Request" }) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API
    onSubmit();
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="bg-slate-50 p-3 rounded-md border border-slate-100 mb-4">
        <p className="text-sm font-medium text-slate-700">Package: <span className="font-bold">{pkg.packageName}</span></p>
      </div>
      {children}
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? 'Processing...' : buttonText}
        </Button>
      </div>
    </form>
  );
};

export const UpgradePlanForm = ({ pkg, onSuccess }) => {
  const [newPlan, setNewPlan] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const plans = Object.keys(HOSTING_PLANS[Object.keys(HOSTING_PLANS).find(key => HOSTING_PLANS[key] === pkg.type) || 'SHARED']);

  const handleSubmit = () => {
    addHostingRequest({
      customerId: pkg.customerId,
      packageId: pkg.id,
      packageName: pkg.packageName,
      type: REQUEST_TYPE.UPGRADE,
      details: { currentPlan: pkg.plan, newPlan, notes }
    });
    toast({ title: "Upgrade Requested", description: "Your upgrade request has been submitted." });
    onSuccess();
  };

  return (
    <BaseHostingForm pkg={pkg} onSubmit={handleSubmit} title="Upgrade Plan">
      <div className="space-y-2">
        <Label>Select New Plan</Label>
        <select 
          value={newPlan} 
          onChange={e => setNewPlan(e.target.value)}
          className="w-full p-2 border border-slate-300 rounded-md text-sm"
          required
        >
          <option value="">Select Plan...</option>
          {plans.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Additional Notes</Label>
        <textarea 
          className="w-full p-2 border border-slate-300 rounded-md text-sm min-h-[80px]" 
          value={notes} 
          onChange={e => setNotes(e.target.value)} 
          placeholder="Any specific requirements?"
        />
      </div>
    </BaseHostingForm>
  );
};

export const DowngradePlanForm = ({ pkg, onSuccess }) => {
    const [newPlan, setNewPlan] = useState('');
    const [reason, setReason] = useState('');
    const { toast } = useToast();

    // Simplified plan retrieval - in real app would filter available downgrades
    const plans = ['Basic', 'Standard', 'Premium']; 

    const handleSubmit = () => {
        addHostingRequest({
            customerId: pkg.customerId,
            packageId: pkg.id,
            packageName: pkg.packageName,
            type: REQUEST_TYPE.DOWNGRADE,
            details: { currentPlan: pkg.plan, newPlan, reason }
        });
        toast({ title: "Downgrade Requested", description: "Your downgrade request is under review." });
        onSuccess();
    };

    return (
        <BaseHostingForm pkg={pkg} onSubmit={handleSubmit} title="Downgrade Plan">
             <div className="space-y-2">
                <Label>Select New Plan</Label>
                <select 
                    value={newPlan} 
                    onChange={e => setNewPlan(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    required
                >
                    <option value="">Select Plan...</option>
                    {plans.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
            </div>
            <div className="space-y-2">
                <Label>Reason for Downgrade</Label>
                <textarea 
                    className="w-full p-2 border border-slate-300 rounded-md text-sm min-h-[80px]" 
                    value={reason} 
                    onChange={e => setReason(e.target.value)} 
                    placeholder="Why are you downgrading?"
                    required
                />
            </div>
        </BaseHostingForm>
    );
};

export const RenewalRequestForm = ({ pkg, onSuccess }) => {
    const [period, setPeriod] = useState('Yearly');
    const [notes, setNotes] = useState('');
    const { toast } = useToast();

    const handleSubmit = () => {
        addHostingRequest({
            customerId: pkg.customerId,
            packageId: pkg.id,
            packageName: pkg.packageName,
            type: REQUEST_TYPE.RENEWAL,
            details: { period, notes }
        });
        toast({ title: "Renewal Requested", description: "We will generate an invoice shortly." });
        onSuccess();
    };

    return (
        <BaseHostingForm pkg={pkg} onSubmit={handleSubmit} title="Renew Hosting">
            <div className="space-y-2">
                <Label>Billing Period</Label>
                <select 
                    value={period} 
                    onChange={e => setPeriod(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                >
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="2 Years">2 Years</option>
                </select>
            </div>
             <div className="space-y-2">
                <Label>Notes</Label>
                <textarea 
                    className="w-full p-2 border border-slate-300 rounded-md text-sm" 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    placeholder="Optional notes"
                />
            </div>
        </BaseHostingForm>
    );
};

export const DomainChangeForm = ({ pkg, onSuccess }) => {
    const [newDomain, setNewDomain] = useState('');
    const { toast } = useToast();

    const handleSubmit = () => {
        addHostingRequest({
            customerId: pkg.customerId,
            packageId: pkg.id,
            packageName: pkg.packageName,
            type: REQUEST_TYPE.DOMAIN_CHANGE,
            details: { currentDomain: pkg.domain, newDomain }
        });
        toast({ title: "Domain Change Requested", description: "Support will update your primary domain." });
        onSuccess();
    };

    return (
        <BaseHostingForm pkg={pkg} onSubmit={handleSubmit} title="Change Primary Domain">
            <div className="space-y-2">
                <Label>New Domain Name</Label>
                <input 
                    type="text"
                    value={newDomain} 
                    onChange={e => setNewDomain(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    placeholder="example.com"
                    required
                />
            </div>
        </BaseHostingForm>
    );
};

export const BackupRestoreForm = ({ pkg, onSuccess }) => {
    const [date, setDate] = useState('');
    const [notes, setNotes] = useState('');
    const { toast } = useToast();

    const handleSubmit = () => {
        addHostingRequest({
            customerId: pkg.customerId,
            packageId: pkg.id,
            packageName: pkg.packageName,
            type: REQUEST_TYPE.BACKUP_RESTORE,
            details: { restoreDate: date, notes }
        });
        toast({ title: "Restore Requested", description: "Tech support has been notified." });
        onSuccess();
    };

    return (
        <BaseHostingForm pkg={pkg} onSubmit={handleSubmit} title="Restore Backup">
            <div className="space-y-2">
                <Label>Restore From Date</Label>
                <input 
                    type="date"
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    required
                />
            </div>
             <div className="space-y-2">
                <Label>Specific Files/Database?</Label>
                <textarea 
                    className="w-full p-2 border border-slate-300 rounded-md text-sm" 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    placeholder="Leave blank for full restore, or specify files..."
                />
            </div>
        </BaseHostingForm>
    );
};

export const CPanelResendForm = ({ pkg, onSuccess }) => {
     const { toast } = useToast();

    const handleSubmit = () => {
        addHostingRequest({
            customerId: pkg.customerId,
            packageId: pkg.id,
            packageName: pkg.packageName,
            type: REQUEST_TYPE.CPANEL_RESEND,
            details: {}
        });
        toast({ title: "Details Requested", description: "Login details will be emailed to you." });
        onSuccess();
    };

    return (
        <BaseHostingForm pkg={pkg} onSubmit={handleSubmit} title="Resend cPanel Details" buttonText="Send Details">
            <p className="text-sm text-slate-600">
                Click below to request your cPanel username, password, and login URL to be sent to your registered email address.
            </p>
        </BaseHostingForm>
    );
};

export const CancellationForm = ({ pkg, onSuccess }) => {
    const [reason, setReason] = useState('');
    const { toast } = useToast();

    const handleSubmit = () => {
        addHostingRequest({
            customerId: pkg.customerId,
            packageId: pkg.id,
            packageName: pkg.packageName,
            type: REQUEST_TYPE.CANCELLATION,
            details: { reason }
        });
        toast({ title: "Cancellation Requested", description: "We are sorry to see you go." });
        onSuccess();
    };

    return (
        <BaseHostingForm pkg={pkg} onSubmit={handleSubmit} title="Request Cancellation" buttonText="Request Cancellation">
             <div className="space-y-2">
                <Label>Reason for Cancellation</Label>
                <textarea 
                    className="w-full p-2 border border-slate-300 rounded-md text-sm min-h-[100px]" 
                    value={reason} 
                    onChange={e => setReason(e.target.value)} 
                    placeholder="Please tell us why..."
                    required
                />
            </div>
        </BaseHostingForm>
    );
};

export const SupportTicketForm = ({ pkg, onSuccess }) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const { toast } = useToast();

    const handleSubmit = () => {
        addHostingRequest({
            customerId: pkg.customerId,
            packageId: pkg.id,
            packageName: pkg.packageName,
            type: REQUEST_TYPE.SUPPORT,
            details: { subject, message }
        });
        toast({ title: "Ticket Created", description: "Our team will respond shortly." });
        onSuccess();
    };

    return (
        <BaseHostingForm pkg={pkg} onSubmit={handleSubmit} title="Open Support Ticket">
             <div className="space-y-2">
                <Label>Subject</Label>
                <input 
                    type="text"
                    value={subject} 
                    onChange={e => setSubject(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    placeholder="Brief summary of issue"
                    required
                />
            </div>
            <div className="space-y-2">
                <Label>Message</Label>
                <textarea 
                    className="w-full p-2 border border-slate-300 rounded-md text-sm min-h-[120px]" 
                    value={message} 
                    onChange={e => setMessage(e.target.value)} 
                    placeholder="Detailed description of the problem..."
                    required
                />
            </div>
        </BaseHostingForm>
    );
};

// Placeholder forms for completeness
export const MigrationForm = ({ pkg, onSuccess }) => {
    const handleSubmit = () => { onSuccess(); };
    return <BaseHostingForm pkg={pkg} onSubmit={handleSubmit}><p>Migration form here</p></BaseHostingForm>
};
export const SSLInstallationForm = ({ pkg, onSuccess }) => {
    const handleSubmit = () => { onSuccess(); };
    return <BaseHostingForm pkg={pkg} onSubmit={handleSubmit}><p>SSL form here</p></BaseHostingForm>
};
export const EmailSetupForm = ({ pkg, onSuccess }) => {
    const handleSubmit = () => { onSuccess(); };
    return <BaseHostingForm pkg={pkg} onSubmit={handleSubmit}><p>Email setup form here</p></BaseHostingForm>
};
export const DatabaseSetupForm = ({ pkg, onSuccess }) => {
    const handleSubmit = () => { onSuccess(); };
    return <BaseHostingForm pkg={pkg} onSubmit={handleSubmit}><p>DB setup form here</p></BaseHostingForm>
};