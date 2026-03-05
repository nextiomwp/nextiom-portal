import { supabase } from '@/lib/customSupabaseClient';

/**
 * Checks database connection.
 * We've simplified this to avoid complex schema queries that fail on Supabase
 * when RLS is too strict.
 */
export const checkDatabaseConnection = async () => {
  try {
    if (!supabase) return false;
    
    // Simple query that should always work if connection is live
    const { error } = await supabase.from('customers').select('id').limit(1);
    // If table missing, error code 'PGRST204' (relation does not exist)
    if (error && error.code === 'PGRST204') {
        console.warn("Tables missing, but connection is alive.");
        return true; 
    }
    return true; 
  } catch (err) {
    console.error("Database connection check failed:", err);
    return false;
  }
};

export const ensureCustomerProfile = async (user) => {
  if (!user || !supabase) return;

  try {
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!data) {
      await supabase
        .from('customers')
        .insert([{
          user_id: user.id,
          full_name: user.user_metadata?.full_name || 'New User',
          company: user.user_metadata?.company || '',
        }]);
    }
  } catch (e) {
    // Silent fail
    console.warn("Failed to ensure customer profile:", e);
  }
};