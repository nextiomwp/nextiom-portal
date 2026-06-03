import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

export function useImpersonation() {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState('00:00');
  const [impersonatedUser, setImpersonatedUser] = useState(null);

  // Read impersonated user from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('impersonated_user');
    if (stored) {
      try {
        setImpersonatedUser(JSON.parse(stored));
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (!isImpersonating()) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const m = String(Math.floor(diff / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setElapsed(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isImpersonating = useCallback(() => {
    return !!sessionStorage.getItem('impersonation_token');
  }, []);

  const startImpersonation = useCallback(async (customer) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const adminToken = session?.access_token;

      if (!adminToken) {
        throw new Error('No admin session found');
      }

      if (!customer.user_id) {
        throw new Error('Customer has no linked user ID');
      }

      sessionStorage.setItem('impersonation_token', 'impersonating');
      sessionStorage.setItem('impersonated_user', JSON.stringify({
        id: customer.user_id,
        customer_id: customer.id,
        email: customer.email,
        name: customer.name,
      }));
      sessionStorage.setItem('original_admin_token', adminToken);

      // Log to impersonation_logs
      try {
        await supabase.from('impersonation_logs').insert({
          admin_id: session.user.id,
          target_user_id: customer.user_id,
          action: 'start',
          started_at: new Date().toISOString(),
        });
      } catch {
        // non-critical
      }

      setImpersonatedUser({ id: customer.user_id, email: customer.email, name: customer.name });

      navigate(`/admin/impersonate/${customer.id}`);
    } catch (err) {
      throw err;
    }
  }, [navigate]);

  const exitImpersonation = useCallback(async () => {
    try {
      const adminToken = sessionStorage.getItem('original_admin_token');

      // Log exit
      try {
        const { data: { user } } = await supabase.auth.getSession();
        const impersonated = JSON.parse(sessionStorage.getItem('impersonated_user') || '{}');
        if (user?.id && impersonated?.id) {
          const { data: logs } = await supabase
            .from('impersonation_logs')
            .select('id')
            .eq('admin_id', user.id)
            .eq('target_user_id', impersonated.id)
            .eq('action', 'start')
            .is('ended_at', null)
            .order('started_at', { ascending: false })
            .limit(1);

          if (logs?.[0]?.id) {
            await supabase
              .from('impersonation_logs')
              .update({ ended_at: new Date().toISOString(), action: 'exit' })
              .eq('id', logs[0].id);
          }
        }
      } catch {
        // non-critical
      }

      // Restore admin session
      if (adminToken) {
        try {
          await supabase.auth.setSession({
            access_token: adminToken,
            refresh_token: '',
          });
        } catch {
          // session may still be valid
        }
      }

      // Clear all impersonation data
      sessionStorage.removeItem('impersonation_token');
      sessionStorage.removeItem('impersonated_user');
      sessionStorage.removeItem('original_admin_token');

      setImpersonatedUser(null);
      setElapsed('00:00');

      navigate('/admin-dashboard', { replace: true });
    } catch {
      // Force clear even on error
      sessionStorage.removeItem('impersonation_token');
      sessionStorage.removeItem('impersonated_user');
      sessionStorage.removeItem('original_admin_token');
      setImpersonatedUser(null);
      setElapsed('00:00');
      navigate('/admin-dashboard', { replace: true });
    }
  }, [navigate]);

  return {
    startImpersonation,
    exitImpersonation,
    isImpersonating,
    impersonatedUser,
    elapsed,
  };
}

export default useImpersonation;
