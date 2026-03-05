import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Mail, Trash2, Shield, Eye, EyeOff, Server, HardDrive, Database, Wifi, Clock, Activity, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { 
    updateHostingPackage, 
    HOSTING_STATUS, 
    HOSTING_TYPES, 
    getHostingActivityLog, 
    getHostingRequests,
    getDomains 
} from '@/lib/storage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function AdminHostingDetailsView({ pkg, customer, onBack }) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState(pkg);
  const [showPassword, setShowPassword] = useState(false);
  const [logs, setLogs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [domains, setDomains] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    setLogs(getHostingActivityLog(pkg.id));
    setRequests(getHostingRequests().filter(r => r.packageId === pkg.id));
    setDomains(getDomains().filter(d => d.customerId === customer.id));
  }, [pkg.id, customer.id]);

  const handleUpdate = async (section, data) => {
    setLoading(true);
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let updates = {};
    if (section === 'main') updates = data;
    else if (section === 'usage') updates = { usage: { ...details.usage, ...data } };
    else if (section === 'cpanel') updates = { cpanel: { ...details.cpanel, ...data } };
    else if (section === 'notes') updates = { notes: data };

    updateHostingPackage(pkg.id, updates, 'Admin');
    setDetails({ ...details, ...updates });
    setLogs(getHostingActivityLog(pkg.id)); // Refresh logs
    setLoading(false);
    toast({ title: "Updated Successfully", description: `${section === 'cpanel' ? 'Credentials' : 'Package details'} have been saved.` });
  };

  const handleDelete = () => {
    // In a real app, delete logic here. For now just toast and back.
    toast({ title: "Package Deleted", description: "The hosting package has been removed.", variant: "destructive" });
    onBack();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
       {/* Header */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={onBack} className="h-10 w-10">
                  <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                  <h2 className="text-2xl font-bold text-slate-800">{details.packageName}</h2>
                  <p className="text-slate-500 flex items-center gap-2">
                      <Server className="w-4 h-4" /> {details.domain} • <span className="text-blue-600">{customer?.name}</span>
                  </p>
              </div>
          </div>
          <div className="flex gap-2">
              <Button variant="outline" onClick={() => toast({ title: "Invoice Sent", description: `Invoice sent to ${customer.email}` })}>
                  <FileText className="w-4 h-4 mr-2" /> Send Invoice
              </Button>
              <Button variant="outline" onClick={() => toast({ title: "Email Sent", description: `Notification sent to ${customer.email}` })}>
                  <Mail className="w-4 h-4 mr-2" /> Email
              </Button>
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Delete Hosting Package?</AlertDialogTitle>
                          <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the hosting package and all associated data.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Main Info */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* General Settings */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b">General Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Status</label>
                          <select 
                              value={details.status}
                              onChange={(e) => handleUpdate('main', { status: e.target.value })}
                              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          >
                              {Object.values(HOSTING_STATUS).map(status => (
                                  <option key={status} value={status}>{status}</option>
                              ))}
                          </select>
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Plan</label>
                           {/* Simplified plan dropdown */}
                          <select 
                              value={details.plan}
                              onChange={(e) => handleUpdate('main', { plan: e.target.value })}
                              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          >
                              <option value="Basic">Basic</option>
                              <option value="Standard">Standard</option>
                              <option value="Premium">Premium</option>
                              <option value="VPS1">VPS 1</option>
                          </select>
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Expiry Date</label>
                          <input 
                              type="date"
                              value={details.expiryDate ? details.expiryDate.split('T')[0] : ''}
                              onChange={(e) => handleUpdate('main', { expiryDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Linked Domain</label>
                          <select 
                              value={details.domain}
                              onChange={(e) => handleUpdate('main', { domain: e.target.value })}
                              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          >
                              {domains.map(d => (
                                  <option key={d.id} value={d.name}>{d.name}</option>
                              ))}
                              <option value={details.domain}>{details.domain} (Current)</option>
                          </select>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 md:col-span-2">
                          <div className="flex flex-col">
                              <span className="font-medium text-slate-800">Auto Renewal</span>
                              <span className="text-xs text-slate-500">Automatically renew package on expiry</span>
                          </div>
                          <Switch 
                              checked={details.autoRenew} 
                              onCheckedChange={(checked) => handleUpdate('main', { autoRenew: checked })} 
                          />
                      </div>
                  </div>
              </div>

              {/* Usage Information */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b">
                      <h3 className="text-lg font-bold text-slate-800">Resource Usage</h3>
                      <Button size="sm" onClick={() => handleUpdate('usage', details.usage)} disabled={loading}>
                          {loading ? 'Saving...' : 'Save Usage Stats'}
                      </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                          <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1"><HardDrive className="w-3 h-3"/> Disk (GB)</label>
                          <input 
                              type="number" 
                              value={details.usage?.diskUsage || 0}
                              onChange={(e) => setDetails({...details, usage: {...details.usage, diskUsage: parseFloat(e.target.value)}})}
                              className="w-full p-2 border border-slate-300 rounded-md"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1"><Wifi className="w-3 h-3"/> Bandwidth</label>
                          <input 
                              type="number" 
                              value={details.usage?.bandwidthUsage || 0}
                              onChange={(e) => setDetails({...details, usage: {...details.usage, bandwidthUsage: parseFloat(e.target.value)}})}
                              className="w-full p-2 border border-slate-300 rounded-md"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3"/> Emails</label>
                          <input 
                              type="number" 
                              value={details.usage?.emailAccounts || 0}
                              onChange={(e) => setDetails({...details, usage: {...details.usage, emailAccounts: parseInt(e.target.value)}})}
                              className="w-full p-2 border border-slate-300 rounded-md"
                          />
                      </div>
                       <div className="space-y-2">
                          <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1"><Database className="w-3 h-3"/> DBs</label>
                          <input 
                              type="number" 
                              value={details.usage?.databases || 0}
                              onChange={(e) => setDetails({...details, usage: {...details.usage, databases: parseInt(e.target.value)}})}
                              className="w-full p-2 border border-slate-300 rounded-md"
                          />
                      </div>
                  </div>
              </div>

              {/* cPanel / Credentials */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Shield className="w-5 h-5 text-blue-600"/> cPanel Credentials</h3>
                      <Button size="sm" onClick={() => handleUpdate('cpanel', details.cpanel)} disabled={loading}>
                           {loading ? 'Saving...' : 'Save Credentials'}
                      </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Control Panel URL</label>
                          <input 
                              type="text" 
                              value={details.cpanel?.url || ''}
                              onChange={(e) => setDetails({...details, cpanel: {...details.cpanel, url: e.target.value}})}
                              className="w-full p-2 border border-slate-300 rounded-md"
                              placeholder="https://cpanel.domain.com"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Username</label>
                          <input 
                              type="text" 
                              value={details.cpanel?.username || ''}
                              onChange={(e) => setDetails({...details, cpanel: {...details.cpanel, username: e.target.value}})}
                              className="w-full p-2 border border-slate-300 rounded-md"
                          />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium text-slate-700">Password</label>
                          <div className="relative">
                              <input 
                                  type={showPassword ? "text" : "password"} 
                                  value={details.cpanel?.password || ''}
                                  onChange={(e) => setDetails({...details, cpanel: {...details.cpanel, password: e.target.value}})}
                                  className="w-full p-2 border border-slate-300 rounded-md pr-10"
                              />
                              <button 
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>

          </div>

          {/* Right Column: History & Logs */}
          <div className="space-y-6">
              {/* Internal Notes */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase">Internal Notes</h3>
                  <textarea 
                      className="w-full p-3 border border-slate-300 rounded-md text-sm min-h-[100px] mb-2"
                      placeholder="Add admin notes here..."
                      value={details.notes || ''}
                      onChange={(e) => setDetails({...details, notes: e.target.value})}
                  />
                  <Button size="sm" variant="outline" className="w-full" onClick={() => handleUpdate('notes', details.notes)}>Save Notes</Button>
              </div>

              {/* Activity Log */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Activity Log
                  </h3>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                      {logs.length > 0 ? logs.map(log => (
                          <div key={log.id} className="relative pl-4 border-l-2 border-slate-200 pb-2 last:pb-0">
                              <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-slate-300"></div>
                              <p className="text-xs font-semibold text-slate-800">{log.action}</p>
                              <p className="text-[10px] text-slate-500">{format(new Date(log.timestamp), 'PP p')} • {log.adminName || 'System'}</p>
                              <p className="text-xs text-slate-600 mt-1">{log.details}</p>
                          </div>
                      )) : (
                          <p className="text-xs text-slate-500 italic">No activity yet.</p>
                      )}
                  </div>
              </div>
          </div>
       </div>
    </div>
  );
}

export default AdminHostingDetailsView;