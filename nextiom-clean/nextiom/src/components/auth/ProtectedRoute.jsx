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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF8C42]" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center space-y-4">
          <div className="bg-red-50 p-3 rounded-full w-fit mx-auto">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Authentication Error</h2>
          <p className="text-slate-600">{authError}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-[#FF8C42] hover:bg-[#e67e3b] text-white"
          >
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  if (accessError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center space-y-4">
                <div className="bg-red-50 p-3 rounded-full w-fit mx-auto">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
                <p className="text-slate-600">{accessError}</p>
                <Button 
                    onClick={() => { window.location.href = '/'; }}
                    className="bg-slate-900 text-white"
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

  if (allowedRoles && !allowedRoles.includes(user.user_metadata?.role)) {
    const redirectPath = user.user_metadata?.role === 'admin' ? '/admin-dashboard' : '/customer-dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;