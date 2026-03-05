import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { addDomainRequest, REQUEST_TYPE } from '@/lib/storage';

const BaseForm = ({ domain, onSubmit, children, title, buttonText = "Submit Request" }) => {
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
        <p className="text-sm font-medium text-slate-700">Domain: <span className="font-bold">{domain.name}</span></p>
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

export const RenewalRequestForm = ({ domain, onSuccess }) => {
  const [period, setPeriod] = useState('1');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const handleSubmit = () => {
    addDomainRequest({
      domainId: domain.id,
      domainName: domain.name,
      customerId: domain.customerId,
      type: REQUEST_TYPE.RENEWAL,
      details: { period: `${period} Year(s)`, notes }
    });
    toast({ title: "Renewal Request Sent", description: "Your renewal request has been submitted." });
    onSuccess();
  };

  return (
    <BaseForm domain={domain} onSubmit={handleSubmit} title="Renew Domain">
       <div className="space-y-2">
         <Label>Renewal Period</Label>
         <select 
            value={period} 
            onChange={e => setPeriod(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-md text-sm"
         >
           <option value="1">1 Year</option>
           <option value="2">2 Years</option>
           <option value="3">3 Years</option>
           <option value="5">5 Years</option>
         </select>
       </div>
       <div className="space-y-2">
         <Label>Additional Notes</Label>
         <textarea 
            className="w-full p-2 border border-slate-300 rounded-md text-sm min-h-[80px]" 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            placeholder="Any specific instructions?"
         />
       </div>
    </BaseForm>
  );
};

export const DNSChangeRequestForm = ({ domain, onSuccess }) => {
    const [recordType, setRecordType] = useState('A');
    const [host, setHost] = useState('@');
    const [value, setValue] = useState('');
    const { toast } = useToast();

    const handleSubmit = () => {
        addDomainRequest({
            domainId: domain.id,
            domainName: domain.name,
            customerId: domain.customerId,
            type: REQUEST_TYPE.DNS_CHANGE,
            details: { recordType, host, value }
        });
        toast({ title: "DNS Request Submitted", description: "The support team will review your DNS changes." });
        onSuccess();
    };

    return (
        <BaseForm domain={domain} onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Record Type</Label>
                    <select value={recordType} onChange={e => setRecordType(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm">
                        <option value="A">A Record</option>
                        <option value="CNAME">CNAME</option>
                        <option value="MX">MX</option>
                        <option value="TXT">TXT</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <Label>Host / Name</Label>
                    <input type="text" value={host} onChange={e => setHost(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Value / Destination</Label>
                <input type="text" value={value} onChange={e => setValue(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" placeholder="e.g. 192.168.1.1" required />
            </div>
        </BaseForm>
    );
};

export const NameserverUpdateForm = ({ domain, onSuccess }) => {
    const [ns1, setNs1] = useState('');
    const [ns2, setNs2] = useState('');
    const { toast } = useToast();

    const handleSubmit = () => {
        addDomainRequest({
            domainId: domain.id,
            domainName: domain.name,
            customerId: domain.customerId,
            type: REQUEST_TYPE.NAMESERVER,
            details: { ns1, ns2 }
        });
        toast({ title: "Nameserver Update Requested", description: "Changes may take up to 24 hours to propagate." });
        onSuccess();
    };

    return (
        <BaseForm domain={domain} onSubmit={handleSubmit}>
            <div className="space-y-2">
                <Label>Nameserver 1</Label>
                <input type="text" value={ns1} onChange={e => setNs1(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" placeholder="ns1.example.com" required />
            </div>
            <div className="space-y-2">
                <Label>Nameserver 2</Label>
                <input type="text" value={ns2} onChange={e => setNs2(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" placeholder="ns2.example.com" required />
            </div>
        </BaseForm>
    );
};

export const ContactUpdateForm = ({ domain, onSuccess }) => {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const { toast } = useToast();

    const handleSubmit = () => {
        addDomainRequest({
            domainId: domain.id,
            domainName: domain.name,
            customerId: domain.customerId,
            type: REQUEST_TYPE.CONTACT,
            details: { newEmail: email, newPhone: phone }
        });
        toast({ title: "Contact Update Requested", description: "We will verify the new contact details." });
        onSuccess();
    };

    return (
        <BaseForm domain={domain} onSubmit={handleSubmit}>
            <div className="space-y-2">
                <Label>New Email Address</Label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" placeholder="admin@newcompany.com" />
            </div>
            <div className="space-y-2">
                <Label>New Phone Number</Label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" placeholder="+1234567890" />
            </div>
        </BaseForm>
    );
};

export const SupportTicketForm = ({ domain, onSuccess }) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const { toast } = useToast();

    const handleSubmit = () => {
        addDomainRequest({
            domainId: domain.id,
            domainName: domain.name,
            customerId: domain.customerId,
            type: REQUEST_TYPE.SUPPORT,
            details: { subject, message }
        });
        toast({ title: "Support Ticket Created", description: "Our team will respond shortly." });
        onSuccess();
    };

    return (
        <BaseForm domain={domain} onSubmit={handleSubmit}>
            <div className="space-y-2">
                <Label>Subject</Label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" placeholder="Issue regarding domain..." required />
            </div>
            <div className="space-y-2">
                <Label>Message</Label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm min-h-[100px]" placeholder="Describe your issue..." required />
            </div>
        </BaseForm>
    );
};