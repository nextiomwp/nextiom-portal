import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AUTH_ERRORS } from '@/lib/authErrors';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, authError } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [accessCheckLoading, setAccessCheckLoading] = useState(true);
  const [accessError, setAccessError] = useState(null);

  useEffect(() => {
    const checkCustomerStatus = async () => {
      if (!loading && user) {
        try {
          if (user.user_metadata?.role === 'customer') {
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
    if (!loading && user && allowedRoles && !allowedRoles.includes(user.user_metadata?.role)) {
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
        <Loader2 className="h-8 w-8 animate-spin text-[#E87B35]" />
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
            onClick={() => window.location.reload()}
            className="bg-[#E87B35] hover:bg-[#d06b28] text-white"
          >
            Retry Connection
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
          <div className="p-3 rounded-full w-fit mx-auto" style={{ background: isPending ? 'rgba(232,123,53,0.15)' : 'rgba(239,68,68,0.15)' }}>
            <AlertTriangle className={`h-8 w-8 ${isPending ? 'text-[#E87B35]' : 'text-red-400'}`} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: '#fff' }}>{isPending ? 'Pending Approval' : 'Access Restricted'}</h2>
          <p style={{ color: '#a0a0a0' }}>{isPending ? 'Please wait for admin approval before accessing your account.' : accessError}</p>
          <Button onClick={() => { window.location.href = '/'; }} style={{ background: '#E87B35', color: '#fff' }} className="hover:opacity-90">
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.user_metadata?.role)) {
    const redirectPath = user.user_metadata?.role === 'admin' ? '/admin-dashboard' : '/customer-dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;