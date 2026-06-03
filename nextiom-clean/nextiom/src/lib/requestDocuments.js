import { supabase } from '@/lib/customSupabaseClient';

const normalizeRequestDocumentPath = (documentPath) => String(documentPath || '')
  .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/request-documents\//, '')
  .replace(/^request-documents\//, '')
  .replace(/^\/+/, '');

export const getAdminRequestDocumentUrl = async (documentPath) => {
  if (!documentPath) return null;
  const path = normalizeRequestDocumentPath(documentPath);

  try {
    const { data, error } = await supabase.functions.invoke('admin-document-link', {
      body: { path },
    });

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch (err) {
    console.warn('admin-document-link unavailable, falling back to public document URL:', err);
  }

  const { data } = supabase.storage.from('request-documents').getPublicUrl(path);
  return data?.publicUrl;
};
