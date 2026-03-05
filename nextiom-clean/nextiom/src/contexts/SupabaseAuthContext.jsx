import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { getCustomerByEmail, getUserProfile } from '@/lib/storage';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        if (session?.user) {
          await handleUserSession(session.user);
        } else {
          setLoading(false);
        }
      }
    }

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await handleUserSession(session.user);
      } else {
        if (mounted) {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleUserSession = async (authUser) => {
    try {
      const userRole = authUser.user_metadata?.role || 'customer';
      
      // If customer, ensure we have a customer record
      if (userRole === 'customer') {
          const profile = await getUserProfile(authUser.id);
          // If no profile, we might be in a race condition with registration, 
          // or user exists in Auth but not in public.customers table yet.
          // For now, we trust Auth.
      }
      
      setUser(authUser);
      setRole(userRole);
    } catch (err) {
      console.error("Error handling user session:", err);
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
    return { data, error: null };
  };

  const signUp = async (email, password, metadata = {}) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'customer',
          ...metadata
        }
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
            status: 'active',
            created_at: new Date().toISOString()
        }]);
        
        if (profileError) console.error("Could not create customer profile", profileError);
    }

    setLoading(false);
    return { data, error: null };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setRole(null);
    }
    setLoading(false);
    return { error };
  };

  const value = {
    user,
    role,
    loading,
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