import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { getCustomerByEmail, getUserProfile, addNotification, getMaintenanceStatus, getPortalSettings, applyThemeColor, DEFAULT_MODERATOR_PERMISSIONS, ADMIN_PERMISSIONS } from '@/lib/storage';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState(ADMIN_PERMISSIONS);
  const [moderatorProfile, setModeratorProfile] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);

  const clearStaleAuth = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-'))
      .forEach(k => localStorage.removeItem(k));
  };

  useEffect(() => {
    // Initial fetch and application of the theme color
    getPortalSettings().then((settings) => {
      if (settings?.themeColor) {
        applyThemeColor(settings.themeColor);
      }
    });

    // Realtime listener for theme updates
    const channel = supabase
      .channel('public-portal-settings-theme')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'portal_settings', filter: 'id=eq.1' },
        (payload) => {
          if (payload.new && payload.new.theme_color) {
            applyThemeColor(payload.new.theme_color);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'TOKEN_REFRESHED' && !session) {
        clearStaleAuth();
        setUser(null);
        setRole(null);
        setModeratorProfile(null);
        setCustomerProfile(null);
        setPermissions({});
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
        setModeratorProfile(null);
        setCustomerProfile(null);
        setPermissions({});
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
      const { data: { session: liveSession } } = await supabase.auth.getSession();
      if (!liveSession || liveSession.user?.id !== authUser.id) return;

      const userRole = authUser.app_metadata?.role || 'customer';

      if (userRole === 'admin') {
        setPermissions(ADMIN_PERMISSIONS);
        setModeratorProfile(null);
        setCustomerProfile(null);
      } else if (userRole === 'moderator') {
        setCustomerProfile(null);
        const { data: modProfile } = await supabase
          .from('moderators')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        if (modProfile) {
          if (modProfile.status !== 'active') {
            clearStaleAuth();
            await supabase.auth.signOut({ scope: 'local' });
            setUser(null);
            setRole(null);
            setModeratorProfile(null);
            setPermissions({});
            setLoading(false);
            return;
          }
          setModeratorProfile(modProfile);
          setPermissions({ ...DEFAULT_MODERATOR_PERMISSIONS, ...(modProfile.permissions || {}) });
        } else {
          setPermissions(DEFAULT_MODERATOR_PERMISSIONS);
        }
      } else if (userRole === 'customer') {
        setModeratorProfile(null);
        setPermissions({});
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

      try {
        const settings = await getPortalSettings();
        if (settings?.themeColor) {
          applyThemeColor(settings.themeColor);
        }
      } catch (themeErr) {
        console.warn('Failed to load or apply theme color on session update:', themeErr);
      }
    } catch (err) {
      console.error("Error handling user session:", err);
      clearStaleAuth();
      await supabase.auth.signOut({ scope: 'local' });
      setUser(null);
      setRole(null);
      setModeratorProfile(null);
      setCustomerProfile(null);
      setPermissions({});
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

    const signedInRole = data.user?.app_metadata?.role || 'customer';

    if (signedInRole === 'admin') {
      addNotification({
        customer_id: null,
        type: 'admin_login',
        title: 'Admin Login',
        message: `${email} signed in to the admin panel.`,
        actor_id: data.user.id,
        actor_name: 'Admin',
        actor_role: 'admin',
      }).catch(() => {});
    } else if (signedInRole === 'moderator') {
      const { data: modProfile } = await supabase
        .from('moderators')
        .select('id, name, status')
        .eq('user_id', data.user.id)
        .single();

      if (modProfile && modProfile.status !== 'active') {
        await supabase.auth.signOut();
        setLoading(false);
        return { error: { message: 'ACCOUNT_DISABLED', description: 'Your moderator account has been disabled. Please contact an administrator.' } };
      }

      const modName = modProfile?.name || data.user?.user_metadata?.full_name || 'Moderator';
      addNotification({
        customer_id: null,
        type: 'moderator_login',
        title: `Moderator Login — ${modName}`,
        message: `${modName} (${email}) signed in to the admin panel.`,
        actor_id: data.user.id,
        actor_name: modName,
        actor_role: 'moderator',
      }).catch(() => {});
    } else {
      // Customer
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
        .select('id, status')
        .eq('user_id', data.user.id)
        .single();
      if (profile?.status === 'pending') {
        await supabase.auth.signOut();
        setLoading(false);
        return { error: { message: 'ACCOUNT_PENDING' } };
      }
      if (profile?.status === 'restricted') {
        await supabase.auth.signOut();
        setLoading(false);
        return { error: { message: 'ACCOUNT_RESTRICTED' } };
      }
      if (profile?.status === 'rejected') {
        await supabase.auth.signOut();
        setLoading(false);
        return { error: { message: 'ACCOUNT_REJECTED' } };
      }

      addNotification({
        customer_id: profile?.id || null,
        type: 'customer_login',
        title: 'Customer Login',
        message: `${email} signed in to the portal.`,
        actor_id: data.user.id,
        actor_name: profile?.name || email,
        actor_role: 'customer',
      }).catch((err) => {
        console.error('Failed to insert customer login notification:', err);
      });
    }

    return { data, error: null };
  };

  const signUp = async (email, password, metadata = {}) => {
    setLoading(true);
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
    
    if (data.user) {
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
    setModeratorProfile(null);
    setCustomerProfile(null);
    setPermissions({});
    setLoading(false);
    return { error };
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const profile = await getUserProfile(user.id);
      if (profile) setCustomerProfile(profile);
    }
  };

  const value = {
    user,
    role,
    permissions,
    moderatorProfile,
    customerProfile,
    isAdmin: role === 'admin',
    isModerator: role === 'moderator',
    isStaff: role === 'admin' || role === 'moderator',
    displayName: role === 'admin' ? 'Admin' : role === 'moderator' ? (moderatorProfile?.name || 'Moderator') : (customerProfile?.name || user?.email),
    loading,
    refreshProfile,
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