import React from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns'; // Or native Date
import { DOMAIN_STATUS, REQUEST_STATUS, getDomainRequests, getDomainActivityLog } from '@/lib/storage';
import { CheckCircle, Clock, AlertCircle, XCircle, FileText, Activity } from 'lucide-react';

function DomainDetailsModal({ domain, isOpen, onClose }) {
  // Hooks must be called unconditionally at the top level
  const [requests, setRequests] = React.useState([]);
  const [logs, setLogs] = React.useState([]);

  React.useEffect(() => {
    if (domain) {
        getDomainRequests().then(reqs => {
            setRequests(reqs.filter(r => r.domainId === domain.id));
        });
        setLogs(getDomainActivityLog(domain.id));
    }
  }, [domain]);

  // Early return must happen AFTER hooks
  if (!domain) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case DOMAIN_STATUS.ACTIVE: return 'bg-green-100 text-green-700';
      case DOMAIN_STATUS.EXPIRED: return 'bg-red-100 text-red-700';
      case DOMAIN_STATUS.PENDING: return 'bg-yellow-100 text-yellow-700';
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center pr-4">
            <div>
                 <DialogTitle className="text-xl font-bold">{domain.name}</DialogTitle>
                 <DialogDescription>Manage details and view history</DialogDescription>
            </div>
            <Badge className={getStatusColor(domain.status)}>{domain.status}</Badge>
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium uppercase">Expiry Date</p>
                <p className="font-semibold text-slate-800 mt-1">
                    {domain.expiryDate ? new Date(domain.expiryDate).toLocaleDateString() : 'N/A'}
                </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium uppercase">Auto Renew</p>
                <p className="font-semibold text-slate-800 mt-1">
                    {domain.autoRenew ? 'Enabled' : 'Disabled'}
                </p>
            </div>
          </div>

          {/* Request History */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Request History
            </h3>
            {requests.length > 0 ? (
                <div className="space-y-3">
                    {requests.map(req => (
                        <div key={req.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-md bg-white hover:bg-slate-50">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">{req.type}</p>
                                <p className="text-xs text-slate-500">{new Date(req.submittedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {getRequestStatusIcon(req.status)}
                                <span className="text-xs font-medium text-slate-700">{req.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-slate-500 italic">No requests found for this domain.</p>
            )}
          </div>

          {/* Activity Log */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Activity Log
            </h3>
            <div className="border-l-2 border-slate-200 pl-4 space-y-4 ml-1">
                {logs.length > 0 ? logs.slice(0, 5).map(log => (
                    <div key={log.id} className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white"></div>
                        <p className="text-xs font-semibold text-slate-700">{log.action}</p>
                        <p className="text-[10px] text-slate-500 mb-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                        <p className="text-xs text-slate-600">{log.details}</p>
                    </div>
                )) : (
                    <p className="text-sm text-slate-500 italic">No activity recorded yet.</p>
                )}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DomainDetailsModal;