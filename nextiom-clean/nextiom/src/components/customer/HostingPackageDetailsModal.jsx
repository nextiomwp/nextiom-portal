import React from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  HOSTING_STATUS, REQUEST_STATUS, getHostingRequests, getHostingActivityLog, updateHostingPackage 
} from '@/lib/storage';
import { 
  CheckCircle, Clock, XCircle, HardDrive, Wifi, Mail, Database, Server, RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

function HostingPackageDetailsModal({ pkg, isOpen, onClose }) {
  const { toast } = useToast();
  const [requests, setRequests] = React.useState([]);
  const [logs, setLogs] = React.useState([]);

  React.useEffect(() => {
    if (pkg) {
        getHostingRequests().then(reqs => {
            setRequests(reqs.filter(r => r.packageId === pkg.id));
        });
        setLogs(getHostingActivityLog(pkg.id));
    }
  }, [pkg]);

  if (!pkg) return null;

  const handleAutoRenewToggle = (checked) => {
    updateHostingPackage(pkg.id, { autoRenew: checked });
    toast({ title: "Updated", description: `Auto-renew has been turned ${checked ? 'on' : 'off'}.` });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case HOSTING_STATUS.ACTIVE: return 'bg-green-100 text-green-700';
      case HOSTING_STATUS.EXPIRED: return 'bg-red-100 text-red-700';
      case HOSTING_STATUS.SUSPENDED: return 'bg-orange-100 text-orange-700';
      case HOSTING_STATUS.PENDING: return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getRequestStatusIcon = (status) => {
    switch(status) {
        case REQUEST_STATUS.COMPLETED: 
        case REQUEST_STATUS.APPROVED: return <CheckCircle className="w-4 h-4 text-green-600" />;
        case REQUEST_STATUS.REJECTED: return <XCircle className="w-4 h-4 text-red-600" />;
        default: return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center pr-4">
            <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-50 rounded-lg">
                    <Server className="w-6 h-6 text-blue-600" />
                 </div>
                 <div>
                    <DialogTitle className="text-xl font-bold">{pkg.packageName}</DialogTitle>
                    <DialogDescription>{pkg.domain}</DialogDescription>
                 </div>
            </div>
            <Badge className={getStatusColor(pkg.status)}>{pkg.status}</Badge>
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium uppercase mb-1">Plan Details</p>
                <p className="font-semibold text-slate-800">{pkg.plan} Plan</p>
                <p className="text-xs text-slate-500">{pkg.type}</p>
             </div>
             <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium uppercase mb-1">Billing</p>
                <p className="font-semibold text-slate-800">{pkg.billingPeriod}</p>
                <p className="text-xs text-slate-500">Next Invoice: {pkg.expiryDate ? new Date(pkg.expiryDate).toLocaleDateString() : 'N/A'}</p>
             </div>
             <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                    <p className="text-xs text-slate-500 font-medium uppercase">Auto Renew</p>
                    <Switch checked={pkg.autoRenew} onCheckedChange={handleAutoRenewToggle} />
                </div>
                <p className="text-xs text-slate-500">Automatically renews on expiry</p>
             </div>
          </div>

          {/* Usage Stats */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">Resource Usage</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border border-slate-200 rounded-md p-3 flex flex-col items-center text-center">
                    <HardDrive className="w-5 h-5 text-slate-400 mb-2" />
                    <span className="text-lg font-bold text-slate-800">{pkg.usage?.diskUsage || 0} GB</span>
                    <span className="text-xs text-slate-500">Disk Usage</span>
                </div>
                <div className="border border-slate-200 rounded-md p-3 flex flex-col items-center text-center">
                    <Wifi className="w-5 h-5 text-slate-400 mb-2" />
                    <span className="text-lg font-bold text-slate-800">{pkg.usage?.bandwidthUsage || 0} GB</span>
                    <span className="text-xs text-slate-500">Bandwidth</span>
                </div>
                <div className="border border-slate-200 rounded-md p-3 flex flex-col items-center text-center">
                    <Mail className="w-5 h-5 text-slate-400 mb-2" />
                    <span className="text-lg font-bold text-slate-800">{pkg.usage?.emailAccounts || 0}</span>
                    <span className="text-xs text-slate-500">Email Accounts</span>
                </div>
                <div className="border border-slate-200 rounded-md p-3 flex flex-col items-center text-center">
                    <Database className="w-5 h-5 text-slate-400 mb-2" />
                    <span className="text-lg font-bold text-slate-800">{pkg.usage?.databases || 0}</span>
                    <span className="text-xs text-slate-500">Databases</span>
                </div>
            </div>
          </div>

          {/* Request History */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">Recent Requests</h3>
            {requests.length > 0 ? (
                <div className="border rounded-md divide-y divide-slate-100">
                    {requests.slice(0, 5).map(req => (
                        <div key={req.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                            <div>
                                <p className="text-sm font-medium text-slate-800">{req.type}</p>
                                <p className="text-xs text-slate-500">{new Date(req.submittedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {getRequestStatusIcon(req.status)}
                                <span className="text-xs font-medium text-slate-700 capitalize">{req.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-slate-500 italic p-2 border border-dashed rounded-md text-center">No requests found.</p>
            )}
          </div>
          
          <div className="flex justify-end pt-4">
             <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default HostingPackageDetailsModal;