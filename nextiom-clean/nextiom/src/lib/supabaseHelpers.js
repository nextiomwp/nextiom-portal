import { supabase } from '@/lib/customSupabaseClient';

export const getErrorMessage = (error) => {
  if (!error) return 'Unknown error occurred';
  return error.message || error.error_description || 'An unexpected error occurred';
};

export const checkIsAdmin = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata?.role === 'admin';
};

export const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

export const handleSupabaseError = (error, context = 'Operation') => {
  console.error(`${context} failed:`, error);
  throw new Error(getErrorMessage(error));
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString();
};