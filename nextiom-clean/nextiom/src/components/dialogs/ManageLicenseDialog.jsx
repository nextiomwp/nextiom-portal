import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { updateLicense, generateLicenseKey, MEMBERSHIP_TYPES } from '@/lib/storage';
import { RefreshCw, Ban, ShieldCheck, Key } from 'lucide-react';

function ManageLicenseDialog({ open, onOpenChange, license, product, onSuccess }) {
  const [formData, setFormData] = useState({
    membershipType: '',
    activatedDomain: '',
    expiryDate: '',
    isDisabled: false
  });
  const { toast } = useToast();

  useEffect(() => {
    if (license) {
      setFormData({
        membershipType: license.membershipType,
        activatedDomain: license.activatedDomain || '',
        expiryDate: license.expiryDate ? license.expiryDate.split('T')[0] : '',
        isDisabled: license.isDisabled || false
      });
    }
  }, [license]);

  const handleUpdate = () => {
    const updates = {
      membershipType: formData.membershipType,
      activatedDomain: formData.activatedDomain,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
      isDisabled: formData.isDisabled
    };

    updateLicense(license.id, updates);
    toast({
      title: "Success",
      description: "License updated successfully",
    });
    onSuccess();
    onOpenChange(false);
  };

  const handleRenew = () => {
    updateLicense(license.id, { renewYears: 1 });
    toast({
      title: "Renewed",
      description: "License renewed for 1 additional year.",
    });
    onSuccess();
    onOpenChange(false);
  };

  const handleReissueKey = () => {
    const newKey = generateLicenseKey();
    updateLicense(license.id, { licenseKey: newKey });
    toast({
      title: "Reissued",
      description: `New License Key generated: ${newKey}`,
    });
    onSuccess();
    onOpenChange(false);
  };

  const toggleStatus = () => {
    const newStatus = !formData.isDisabled;
    setFormData({ ...formData, isDisabled: newStatus });
  };

  if (!license || !product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Manage License: {product.name}</DialogTitle>
          <DialogDescription>
             License ID: <span className="font-mono text-xs text-slate-500">{license.id}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleRenew}
              disabled={!license.expiryDate || formData.isDisabled}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Renew 1 Year
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleReissueKey}
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            >
              <Key className="w-4 h-4 mr-2" />
              Reissue Key
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={toggleStatus}
              className={formData.isDisabled 
                ? "text-green-600 hover:text-green-700 hover:bg-green-50" 
                : "text-red-600 hover:text-red-700 hover:bg-red-50"
              }
            >
              {formData.isDisabled ? (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" /> Enable License
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 mr-2" /> Disable License
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div>
              <Label htmlFor="membershipType">Membership Type</Label>
              <select
                id="membershipType"
                value={formData.membershipType}
                onChange={(e) => setFormData({ ...formData, membershipType: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <optgroup label="Lifetime Memberships">
                  <option value={MEMBERSHIP_TYPES.LIFETIME_MANUAL}>{MEMBERSHIP_TYPES.LIFETIME_MANUAL}</option>
                  <option value={MEMBERSHIP_TYPES.LIFETIME_LICENSE}>{MEMBERSHIP_TYPES.LIFETIME_LICENSE}</option>
                </optgroup>
                <optgroup label="Yearly Memberships">
                  <option value={MEMBERSHIP_TYPES.YEARLY_LICENSE}>{MEMBERSHIP_TYPES.YEARLY_LICENSE}</option>
                  <option value={MEMBERSHIP_TYPES.YEARLY_WITH_UPDATES}>{MEMBERSHIP_TYPES.YEARLY_WITH_UPDATES}</option>
                  <option value={MEMBERSHIP_TYPES.YEARLY_NO_UPDATES}>{MEMBERSHIP_TYPES.YEARLY_NO_UPDATES}</option>
                </optgroup>
                <optgroup label="Other">
                  <option value={MEMBERSHIP_TYPES.ONE_TIME_USER}>{MEMBERSHIP_TYPES.ONE_TIME_USER}</option>
                </optgroup>
              </select>
            </div>

            <div>
              <Label htmlFor="domain">Locked Domain</Label>
              <input
                id="domain"
                type="text"
                value={formData.activatedDomain}
                onChange={(e) => setFormData({ ...formData, activatedDomain: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!formData.expiryDate} // Can't set expiry for lifetime unless changing type first
              />
              {!formData.expiryDate && <p className="text-xs text-slate-500 mt-1">Lifetime membership (no expiry)</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleUpdate} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ManageLicenseDialog;