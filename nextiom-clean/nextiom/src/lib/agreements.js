import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/customSupabaseClient';

/**
 * Maps standard file extensions to their corresponding MIME types.
 */
const getMimeType = (ext) => {
  const mimeTypes = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif'
  };
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
};

/**
 * Retrieves the current session access token.
 * Throws a clear error if the user is not authenticated.
 */
const getAccessToken = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new Error('Authentication required. Please log in again.');
  }
  return token;
};

/**
 * Uploads a file to a Supabase Storage bucket using a direct fetch call,
 * bypassing the supabase-js SDK storage client. This avoids a race condition
 * where the SDK's internal session state has not yet loaded the JWT,
 * causing the upload to go out unauthenticated and receive an HTTP 400 error
 * (RLS violation reported as 400 by this Supabase version).
 */
const uploadFileDirect = async (bucket, path, file, contentType) => {
  const token = await getAccessToken();
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60-second timeout

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: file,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text().catch(() => `HTTP ${response.status}`);
      console.error(`[agreements] Storage upload failed (${response.status}):`, text);
      throw new Error(`Upload failed (${response.status}): ${text}`);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Upload timed out. Please check your network connection and try again.');
    }
    throw err;
  }
};

/**
 * Deletes files from a Supabase Storage bucket using a direct fetch call.
 */
const deleteFilesDirect = async (bucket, paths) => {
  if (!paths || paths.length === 0) return;
  const token = await getAccessToken().catch(() => null);
  if (!token) return; // Best-effort cleanup; don't throw if session is gone
  const url = `${supabaseUrl}/storage/v1/object/${bucket}`;
  await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefixes: paths }),
  }).catch(console.error);
};

/**
 * Normalise agreement file path to extract relative path inside bucket.
 */
export const normalizeAgreementPath = (documentPath) => String(documentPath || '')
  .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/agreements\//, '')
  .replace(/^agreements\//, '')
  .replace(/^\/+/, '');

/**
 * Get public URL for an agreement file.
 */
export const getAgreementUrl = (filePath) => {
  if (!filePath) return null;
  const path = normalizeAgreementPath(filePath);
  const { data } = supabase.storage.from('agreements').getPublicUrl(path);
  return data?.publicUrl;
};

/**
 * Fetch agreements.
 * Admins get all agreements (with customer details).
 * Customers get their own agreements.
 */
export const getAgreements = async (customerId = null) => {
  let query = supabase.from('agreements').select(`
    *,
    customers:customer_id (id, name, email)
  `);

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

/**
 * Create a new agreement template (Admin only).
 *
 * Uses a direct fetch() call for the storage upload — bypassing the supabase-js
 * SDK storage client — to ensure the admin's JWT is always explicitly included
 * in the Authorization header. The SDK client can miss the JWT if its internal
 * session cache hasn't been populated yet (due to the custom lock bypass used
 * in this app), resulting in an unauthenticated request and an HTTP 400 error.
 */
export const createAgreement = async (customerId, name, file) => {
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
  const fileName = `${Date.now()}_template_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const path = `templates/${customerId}/${fileName}`;
  const contentType = file.type || getMimeType(ext);

  // Upload using direct fetch to guarantee the JWT is in the request
  await uploadFileDirect('agreements', path, file, contentType);

  // Insert into agreements database table
  const { data, error } = await supabase.from('agreements').insert({
    customer_id: customerId,
    name,
    status: 'pending_signature',
    file_path: path,
  }).select().single();

  if (error) {
    // Attempt clean up of uploaded file on DB insert failure
    await supabase.storage.from('agreements').remove([path]);
    throw error;
  }

  return data;
};

/**
 * Upload a signed agreement (Customer only, or Admin).
 *
 * Also uses direct fetch for the same JWT-reliability reason as createAgreement.
 */
export const uploadSignedAgreement = async (agreementId, file) => {
  const { data: agreement, error: getError } = await supabase
    .from('agreements')
    .select('customer_id')
    .eq('id', agreementId)
    .single();

  if (getError) throw getError;

  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
  const fileName = `${Date.now()}_signed_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const path = `signed/${agreement.customer_id}/${fileName}`;
  const contentType = file.type || getMimeType(ext);

  // Upload using direct fetch to guarantee the JWT is in the request
  await uploadFileDirect('agreements', path, file, contentType);

  // Update agreement row status
  const { data, error } = await supabase
    .from('agreements')
    .update({
      signed_file_path: path,
      status: 'signed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', agreementId)
    .select()
    .single();

  if (error) {
    await supabase.storage.from('agreements').remove([path]);
    throw error;
  }

  return data;
};

/**
 * Approve or Complete agreement (Admin only).
 */
export const updateAgreementStatus = async (agreementId, status) => {
  const { data, error } = await supabase
    .from('agreements')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agreementId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete agreement (removes database record & associated storage files).
 */
export const deleteAgreement = async (agreementId) => {
  // Get agreement details to remove storage files
  const { data: agreement, error: getError } = await supabase
    .from('agreements')
    .select('file_path, signed_file_path')
    .eq('id', agreementId)
    .single();

  if (getError) throw getError;

  // Remove DB record
  const { error: deleteError } = await supabase
    .from('agreements')
    .delete()
    .eq('id', agreementId);

  if (deleteError) throw deleteError;

  // Clean up storage files in background
  const pathsToRemove = [];
  if (agreement.file_path) pathsToRemove.push(agreement.file_path);
  if (agreement.signed_file_path) pathsToRemove.push(agreement.signed_file_path);
  
  if (pathsToRemove.length > 0) {
    await supabase.storage.from('agreements').remove(pathsToRemove);
  }

  return true;
};
