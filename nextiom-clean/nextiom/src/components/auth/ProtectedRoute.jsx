import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AUTH_ERRORS } from '@/lib/authErrors';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { getMaintenanceStatus } from '@/lib/storage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, authError, signOut } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [accessCheckLoading, setAccessCheckLoading] = useState(true);
  const [accessError, setAccessError] = useState(null);

  useEffect(() => {
    const checkCustomerStatus = async () => {
      if (!loading && user) {
        try {
          const userRole = user.app_metadata?.role || 'customer';
          if (userRole === 'moderator') {
            const { data: mod, error: modErr } = await supabase
              .from('moderators')
              .select('status')
              .eq('user_id', user.id)
              .single();

            if (modErr || (mod && mod.status !== 'active')) {
              setAccessError("Your moderator account has been disabled.");
            }
          } else if (userRole !== 'admin') {
            // Check maintenance mode
            try {
              const { active, message } = await getMaintenanceStatus();
              if (active) {
                setAccessError(message || 'The system is currently undergoing maintenance. Please check back later.');
                setAccessCheckLoading(false);
                return;
              }
            } catch (e) {
              console.error('Maintenance check error', e);
            }
            const { data, error } = await supabase
               .from('customers')
               .select('status')
               .eq('user_id', user.id)
               .single();
             
             if (error) {
               if(error.code === 'PGRST116') { 
                   setAccessError("Customer account not found.");
               } else {
                   console.error("Status check failed", error);
               }
             } else if (data && data.status === 'pending') {
               setAccessError("PENDING");
             } else if (data && data.status === 'rejected') {
               setAccessError("Your account registration was rejected. Please contact support.");
             } else if (data && data.status !== 'active') {
               setAccessError("Your account has been disabled.");
             }
          }
        } catch (e) {
          console.error("Access check error", e);
        } finally {
          setAccessCheckLoading(false);
        }
      } else if (!loading && !user) {
         setAccessCheckLoading(false);
      }
    };

    checkCustomerStatus();
  }, [loading, user]);

  useEffect(() => {
    if (!loading && user && allowedRoles && !allowedRoles.includes(user.app_metadata?.role || 'customer')) {
       toast({
         variant: "destructive",
         title: "Access Denied",
         description: AUTH_ERRORS.UNAUTHORIZED
       });
    }
  }, [loading, user, allowedRoles, toast]);

  if (loading || accessCheckLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#15161A' }}>
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-color)]" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#15161A' }}>
        <div className="p-8 rounded-xl max-w-md w-full text-center space-y-4" style={{ background: '#1C1E24', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="p-3 rounded-full w-fit mx-auto" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold" style={{ color: '#fff' }}>Authentication Error</h2>
          <p style={{ color: '#a0a0a0' }}>{authError}</p>
          <Button
            onClick={async () => { await signOut(); window.location.href = '/'; }}
            className="bg-[var(--brand-color)] hover:bg-[#d06b28] text-white"
          >
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  if (accessError) {
    const isPending = accessError === 'PENDING';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#15161A' }}>
        <div className="p-8 rounded-xl max-w-md w-full text-center space-y-4" style={{ background: '#1C1E24', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="p-3 rounded-full w-fit mx-auto" style={{ background: isPending ? 'var(--brand-color-light)' : 'rgba(239,68,68,0.15)' }}>
            <AlertTriangle className={`h-8 w-8 ${isPending ? 'text-[var(--brand-color)]' : 'text-red-400'}`} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: '#fff' }}>{isPending ? 'Pending Approval' : 'Access Restricted'}</h2>
          <p style={{ color: '#a0a0a0' }}>{isPending ? 'Please wait for admin approval before accessing your account.' : accessError}</p>
          <Button
            onClick={async () => { await signOut(); window.location.href = '/'; }}
            style={{ background: 'var(--brand-color)', color: '#fff' }}
            className="hover:opacity-90"
          >
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  const effectiveRole = user.app_metadata?.role || 'customer';
  if (allowedRoles && !allowedRoles.includes(effectiveRole)) {
    const redirectPath = effectiveRole === 'admin' ? '/admin-dashboard' : effectiveRole === 'moderator' ? '/moderator-dashboard' : '/customer-dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;