import { supabase } from '@/lib/customSupabaseClient';
import { format as dateFnsFormat } from 'date-fns';

export const getErrorMessage = (error) => {
  if (!error) return 'Unknown error occurred';
  return error.message || error.error_description || 'An unexpected error occurred';
};

export const checkIsAdmin = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  // Role lives in app_metadata (server-only). user_metadata is user-writable
  // via supabase.auth.updateUser({ data: ... }) and must NOT be trusted.
  return user?.app_metadata?.role === 'admin';
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

export const format = (date, formatStr) => {
  if (formatStr === 'yyyy-MM-dd' || formatStr === 'yyyyMMdd' || formatStr === 'yyyy-MM-dd HH:mm:ss') {
    return dateFnsFormat(date, formatStr);
  }
  if (formatStr && (formatStr.includes('MMM') || formatStr.includes('MMMM') || formatStr.includes('PP') || formatStr.includes('yyyy'))) {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const month = monthNames[d.getMonth()];
      const day = d.getDate();
      const year = d.getFullYear();
      
      const hasYear = formatStr.includes('yyyy') || formatStr.includes('yy') || formatStr.includes('PP');
      const datePart = hasYear ? `${month} /  ${day} / ${year}` : `${month} /  ${day}`;
      
      if (formatStr.includes('HH:mm') || formatStr.includes('hh:mm') || formatStr.includes('p')) {
        return `${datePart} at ${dateFnsFormat(d, 'hh:mm a')}`;
      }
      return datePart;
    }
  }
  return dateFnsFormat(date, formatStr);
};