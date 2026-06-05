import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { getCustomerByEmail, getUserProfile, addNotification, getMaintenanceStatus } from '@/lib/storage';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);

  const clearStaleAuth = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-'))
      .forEach(k => localStorage.removeItem(k));
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'TOKEN_REFRESHED' && !session) {
        clearStaleAuth();
        setUser(null);
        setRole(null);
        setCustomerProfile(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        // Defer DB work out of the auth callback — running Supabase queries
        // inside onAuthStateChange deadlocks the auth lock and causes the
        // dashboard to hang on refresh.
        setTimeout(() => {
          if (mounted) handleUserSession(session.user);
        }, 0);
      } else {
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
          clearStaleAuth();
        }
        setUser(null);
        setRole(null);
        setCustomerProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleUserSession = async (authUser) => {
    try {
      // Role MUST come from app_metadata (server-only). user_metadata is
      // user-writable and can be tampered with via supabase.auth.updateUser.
      const userRole = authUser.app_metadata?.role || 'customer';

      if (userRole === 'customer') {
        let profile = await getUserProfile(authUser.id);
        if (!profile) {
          const { data: newProfile } = await supabase
            .from('customers')
            .insert([{
              user_id: authUser.id, email: authUser.email,
              name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
              phone: authUser.user_metadata?.phone || null,
              status: 'pending', created_at: new Date().toISOString(),
            }])
            .select().single();
          profile = newProfile;
        }
        setCustomerProfile(profile || {
          name: authUser.user_metadata?.full_name || authUser.email,
          id: authUser.id, email: authUser.email,
        });
      }

      setUser(authUser);
      setRole(userRole);
    } catch (err) {
      console.error("Error handling user session:", err);
      clearStaleAuth();
      await supabase.auth.signOut({ scope: 'local' });
      setUser(null);
      setRole(null);
      setCustomerProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return { error };
    }
    // Check if customer account is pending approval.
    // Anyone who isn't an admin is treated as a customer (default role).
    const signedInRole = data.user?.app_metadata?.role || 'customer';
    if (signedInRole !== 'admin') {
      // Check if maintenance mode is active
      try {
        const { active, message } = await getMaintenanceStatus();
        if (active) {
          await supabase.auth.signOut();
          setLoading(false);
          return { error: { message: 'MAINTENANCE_MODE', maintenanceMessage: message } };
        }
      } catch (e) {
        console.error('Failed to check maintenance status during login:', e);
      }
      const { data: profile } = await supabase
        .from('customers')
        .select('status')
        .eq('user_id', data.user.id)
        .single();
      if (profile?.status === 'pending') {
        await supabase.auth.signOut();
        setLoading(false);
        return { error: { message: 'ACCOUNT_PENDING' } };
      }
      if (profile?.status === 'rejected') {
        await supabase.auth.signOut();
        setLoading(false);
        return { error: { message: 'ACCOUNT_REJECTED' } };
      }
      // Log successful customer login
      addNotification({
        customer_id: data.user.id,
        type: 'customer_login',
        title: 'Customer Login',
        message: `${email} signed in to the portal.`,
      }).catch(() => {});
    }
    return { data, error: null };
  };

  const signUp = async (email, password, metadata = {}) => {
    setLoading(true);
    // Do NOT pass `role` here — `options.data` writes to user_metadata, which
    // is user-writable and therefore untrusted. New users default to
    // 'customer' on the server; admins must be promoted by setting
    // app_metadata.role = 'admin' via Dashboard or service_role API.
    const { role: _ignoredRole, ...safeMetadata } = metadata;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: safeMetadata
      }
    });

    if (error) {
      setLoading(false);
      return { error };
    }
    
    // Auth trigger usually creates the customer record, but if not, we do it here:
    // This depends on backend triggers. Assuming manual creation for now:
    if (data.user) {
        // Insert into customers table
        const { error: profileError } = await supabase.from('customers').insert([{
            user_id: data.user.id,
            email: email,
            name: metadata.full_name || email.split('@')[0],
            status: 'pending',
            created_at: new Date().toISOString()
        }]);
        
        if (profileError) {
          console.error("Could not create customer profile", profileError);
        } else {
          addNotification({
            customer_id: null,
            type: 'new_registration',
            title: `New Customer: ${metadata.full_name || email.split('@')[0]}`,
            message: `${email} just registered on the portal.`,
          }).catch(() => {});
        }
    }

    setLoading(false);
    return { data, error: null };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    clearStaleAuth();
    setUser(null);
    setRole(null);
    setCustomerProfile(null);
    setLoading(false);
    return { error };
  };

  const value = {
    user,
    role,
    loading,
    customerProfile,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};