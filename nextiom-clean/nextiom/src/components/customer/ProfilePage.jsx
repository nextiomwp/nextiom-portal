import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { updateUserProfile } from '@/lib/storage';
import { Loader2 } from 'lucide-react';

function ProfilePage({ user, onUpdate }) {
  const safeUser = user || {};
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: safeUser.name || '',
    phone: safeUser.phone || '',
    company: safeUser.company || '',
    country: safeUser.country || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
        await updateUserProfile(safeUser.id, formData);
        toast({ title: "Success", description: "Profile updated" });
        setIsEditing(false);
        if (onUpdate) onUpdate();
    } catch (err) {
        toast({ title: "Error", description: "Update failed", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-800">Account Details</h1>
        {!isEditing && <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-2xl font-bold text-slate-600">
                {safeUser.name ? safeUser.name.charAt(0) : 'U'}
            </div>
            <div>
                <h2 className="font-bold text-lg">{safeUser.name}</h2>
                <p className="text-slate-500 text-sm">{safeUser.email}</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>Full Name</Label>
                    <input 
                        type="text" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        disabled={!isEditing}
                        className="w-full mt-1 p-2 border border-slate-300 rounded-md text-sm"
                    />
                </div>
                <div>
                    <Label>Phone</Label>
                    <input 
                        type="tel" 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        disabled={!isEditing}
                        className="w-full mt-1 p-2 border border-slate-300 rounded-md text-sm"
                    />
                </div>
                 <div>
                    <Label>Company</Label>
                    <input 
                        type="text" 
                        value={formData.company} 
                        onChange={e => setFormData({...formData, company: e.target.value})}
                        disabled={!isEditing}
                        className="w-full mt-1 p-2 border border-slate-300 rounded-md text-sm"
                    />
                </div>
            </div>

            {isEditing && (
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            )}
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;