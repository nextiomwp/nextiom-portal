import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mail, Phone, Building2, Globe, ChevronDown, ChevronUp, Edit, Trash2, Plus, Copy, Settings2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { deleteCustomer, calculateExpiryStatus, LICENSE_STATUS } from '@/lib/storage';
import EditCustomerDialog from '@/components/dialogs/EditCustomerDialog';
import ManageLicenseDialog from '@/components/dialogs/ManageLicenseDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 10;

function CustomerList({ customers, licenses, products, onUpdate, onAssignProduct }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState(null);
  const [managingLicense, setManagingLicense] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const toggleExpand = (customerId) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedCustomers(newExpanded);
  };

  const handleDelete = (customerId) => {
    deleteCustomer(customerId);
    onUpdate();
    toast({ title: "Customer deleted", description: "Customer has been removed successfully" });
    setDeletingCustomerId(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "License key copied to clipboard" });
  };

  const getCustomerLicenses = (customerId) => licenses.filter(l => l.customerId === customerId);

  const getCustomerStatus = (customerId) => {
    const customerLicenses = getCustomerLicenses(customerId);
    if (customerLicenses.length === 0) return 'No Licenses';
    const statuses = customerLicenses.map(license =>
      calculateExpiryStatus(license.expiryDate, license.membershipType, license.isDisabled).status
    );
    if (statuses.includes(LICENSE_STATUS.DISABLED)) return LICENSE_STATUS.DISABLED;
    if (statuses.includes(LICENSE_STATUS.EXPIRED)) return LICENSE_STATUS.EXPIRED;
    if (statuses.includes('Expiring Soon')) return 'Expiring Soon';
    return LICENSE_STATUS.ACTIVE;
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.company?.toLowerCase().includes(searchTerm.toLowerCase());
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && getCustomerStatus(customer.id) === statusFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCustomers = filteredCustomers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearch = (val) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleStatusFilter = (val) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Search & Filter */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email or company..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e87b35] focus:border-transparent transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e87b35] focus:border-transparent transition-all"
          >
            <option value="all">All Status</option>
            <option value={LICENSE_STATUS.ACTIVE}>Active</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value={LICENSE_STATUS.EXPIRED}>Expired</option>
            <option value={LICENSE_STATUS.DISABLED}>Disabled</option>
            <option value="No Licenses">No Licenses</option>
          </select>
        </div>

        {/* Results count */}
        <p className="text-xs text-slate-400 mt-3">
          Showing {paginatedCustomers.length} of {filteredCustomers.length} customers
        </p>
      </div>

      {/* Customer List */}
      <div className="divide-y divide-slate-200">
        <AnimatePresence>
          {paginatedCustomers.map((customer, index) => {
            const customerLicenses = getCustomerLicenses(customer.id);
            const isExpanded = expandedCustomers.has(customer.id);
            const status = getCustomerStatus(customer.id);

            return (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className="hover:bg-slate-50 transition-colors"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-slate-800">{customer.name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status === LICENSE_STATUS.ACTIVE ? 'bg-green-100 text-green-800' :
                          status === 'Expiring Soon' ? 'bg-yellow-100 text-yellow-800' :
                            status === LICENSE_STATUS.EXPIRED ? 'bg-red-100 text-red-800' :
                              status === LICENSE_STATUS.DISABLED ? 'bg-slate-800 text-white' :
                                'bg-slate-100 text-slate-600'
                          }`}>
                          {status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span>{customer.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{customer.phone}</span>
                        </div>
                        {customer.company && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>{customer.company}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          <span>{customer.country}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="ghost" size="sm" onClick={() => setEditingCustomer(customer)} className="hover:bg-blue-50 hover:text-blue-600">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeletingCustomerId(customer.id)} className="hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleExpand(customer.id)} className="hover:bg-slate-100">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </Button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 pt-6 border-t border-slate-200"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-slate-700">Assigned Products & Licenses</h4>
                          <Button size="sm" onClick={onAssignProduct} className="bg-[#e87b35] hover:bg-[#d66a24] text-white shadow-md rounded-xl transition-all font-medium border-0">
                            <Plus className="w-4 h-4 mr-1" /> Assign Product
                          </Button>
                        </div>

                        {customerLicenses.length > 0 ? (
                          <div className="space-y-4">
                            {customerLicenses.map((license) => {
                              const product = products.find(p => p.id === license.productId);
                              const licenseStatus = calculateExpiryStatus(license.expiryDate, license.membershipType, license.isDisabled);
                              const updateAvailable = !license.isDisabled &&
                                licenseStatus.status !== LICENSE_STATUS.EXPIRED &&
                                !license.membershipType.includes('Without Updates') &&
                                !license.membershipType.includes('One Time User');

                              return (
                                <div key={license.id} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                  <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
                                        <span className="font-bold text-blue-600 text-lg">{product?.name.charAt(0)}</span>
                                      </div>
                                      <div>
                                        <h5 className="font-bold text-slate-800">{product?.name || 'Unknown Product'}</h5>
                                        <p className="text-xs text-slate-500">{license.membershipType}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${licenseStatus.status === LICENSE_STATUS.ACTIVE ? 'bg-green-100 text-green-800' :
                                        licenseStatus.status === 'Expiring Soon' ? 'bg-yellow-100 text-yellow-800' :
                                          licenseStatus.status === LICENSE_STATUS.DISABLED ? 'bg-slate-800 text-white' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {licenseStatus.status}
                                      </span>
                                      <Button size="sm" variant="outline" onClick={() => setManagingLicense({ license, product })} className="h-8 text-xs">
                                        <Settings2 className="w-3 h-3 mr-1" /> Manage
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 text-sm">
                                    <div className="col-span-1 md:col-span-2">
                                      <p className="text-slate-500 text-xs mb-1">License Key</p>
                                      {license.licenseKey ? (
                                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-slate-200 max-w-sm">
                                          <code className="font-mono text-slate-700 flex-1">{license.licenseKey}</code>
                                          <button onClick={() => copyToClipboard(license.licenseKey)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                            <Copy className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 italic">Not required for this membership</span>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-xs mb-1">Locked Domain</p>
                                      {license.activatedDomain ? (
                                        <p className="text-slate-800 font-medium">{license.activatedDomain}</p>
                                      ) : (
                                        <p className="text-slate-400 text-xs italic">Not set</p>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-xs mb-1">Updates</p>
                                      {updateAvailable ? (
                                        <span className="text-green-600 font-medium text-xs flex items-center">
                                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>Available
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 font-medium text-xs">Unavailable</span>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-xs mb-1">Activated</p>
                                      <p className="text-slate-800 font-medium">{new Date(license.activationDate).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-xs mb-1">Expires On</p>
                                      <p className="text-slate-800 font-medium">{license.expiryDate ? new Date(license.expiryDate).toLocaleDateString() : 'Never'}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-center text-slate-500 py-8 border border-dashed border-slate-300 rounded-lg">
                            No products assigned yet. Click "Assign Product" to start.
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredCustomers.length === 0 && (
          <div className="p-12 text-center text-slate-500">No customers found matching your criteria.</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={page === safePage ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="w-8 h-8 p-0"
              >
                {page}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {editingCustomer && (
        <EditCustomerDialog
          open={!!editingCustomer}
          onOpenChange={(open) => !open && setEditingCustomer(null)}
          customer={editingCustomer}
          onSuccess={() => { setEditingCustomer(null); onUpdate(); }}
        />
      )}

      {managingLicense && (
        <ManageLicenseDialog
          open={!!managingLicense}
          onOpenChange={(open) => !open && setManagingLicense(null)}
          license={managingLicense.license}
          product={managingLicense.product}
          onSuccess={() => { setManagingLicense(null); onUpdate(); }}
        />
      )}

      <AlertDialog open={!!deletingCustomerId} onOpenChange={(open) => !open && setDeletingCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the customer and all associated licenses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deletingCustomerId)} className="bg-red-600 hover:bg-red-700 text-white rounded-xl border-0 shadow-md">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default CustomerList;