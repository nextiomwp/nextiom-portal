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
 * Securely opens an agreement file in a new browser tab WITHOUT exposing
 * any Supabase URL, project ID, or storage token in the browser.
 *
 * Strategy:
 *   1. Download the file as a raw Blob via the authenticated Supabase SDK
 *      (requires the user to be logged in; fails for unauthenticated requests
 *      when the bucket is set to Private in the Supabase dashboard).
 *   2. Wrap the blob in a local `blob:` object URL — this URL is only valid
 *      inside the current browser session and reveals nothing about Supabase.
 *   3. Open the blob URL in a new tab, then revoke it after 60 s to free memory.
 *
 * IMPORTANT: For this to enforce login-required access, the `agreements`
 * Supabase Storage bucket MUST be set to Private in:
 *   Supabase Dashboard → Storage → agreements → Settings → Make Private
 */
export const openAgreementSecurely = async (filePath) => {
  if (!filePath) throw new Error('No file path provided.');

  // Ensure the user has a valid session before proceeding
  await getAccessToken();

  const path = normalizeAgreementPath(filePath);

  // Download the file as a Blob via the authenticated SDK client.
  // The SDK automatically attaches the user's JWT — unauthenticated
  // users will receive a 403 when the bucket is set to Private.
  const { data: blob, error } = await supabase.storage
    .from('agreements')
    .download(path);

  if (error) throw error;
  if (!blob) throw new Error('File could not be retrieved.');

  // Determine MIME type from the file extension
  const ext = path.split('.').pop()?.toLowerCase() || 'pdf';
  const mimeType = getMimeType(ext);
  const typedBlob = new Blob([blob], { type: mimeType });

  // Create a short-lived local blob URL — no Supabase URL is ever visible
  const blobUrl = URL.createObjectURL(typedBlob);
  const tab = window.open(blobUrl, '_blank');

  // Revoke the blob URL after 60 s to free browser memory.
  // The opened tab keeps its own internal reference so the PDF stays visible.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);

  if (!tab) {
    // Fallback: if popup was blocked, trigger a direct download instead
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = path.split('/').pop() || 'agreement.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

/**
 * Fetch agreements.
 * Admins get all agreements (with customer details).
 * Customers get their own agreements.
 */
export const getAgreements = async (customerId = null) => {
  let query = supabase.from('agreements').select(`
    *,
    customers:customer_id (id, name, email, company, phone, address)
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
export const createAgreement = async (customerId, name, file, editorState = null) => {
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
    editor_state: editorState
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
 * Update an existing agreement's fields and handle optional new files.
 */
export const updateAgreement = async (agreementId, { name, customerId, status, newTemplateFile, newSignedFile, clearSignedFile, editorState }) => {
  // 1. Fetch current agreement details to know customer ID and current file paths
  const { data: agreement, error: getError } = await supabase
    .from('agreements')
    .select('*')
    .eq('id', agreementId)
    .single();

  if (getError) throw getError;

  const updateFields = {
    name,
    customer_id: customerId,
    status,
    editor_state: editorState,
    updated_at: new Date().toISOString()
  };

  const oldPathsToDelete = [];

  // 2. Handle new template file if provided
  if (newTemplateFile) {
    const ext = (newTemplateFile.name.split('.').pop() || 'pdf').toLowerCase();
    const fileName = `${Date.now()}_template_${newTemplateFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const path = `templates/${customerId}/${fileName}`;
    const contentType = newTemplateFile.type || getMimeType(ext);

    // Upload using direct fetch
    await uploadFileDirect('agreements', path, newTemplateFile, contentType);
    
    updateFields.file_path = path;
    if (agreement.file_path) {
      oldPathsToDelete.push(agreement.file_path);
    }
  }

  // 3. Handle new signed file if provided
  if (newSignedFile) {
    const ext = (newSignedFile.name.split('.').pop() || 'pdf').toLowerCase();
    const fileName = `${Date.now()}_signed_${newSignedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const path = `signed/${customerId}/${fileName}`;
    const contentType = newSignedFile.type || getMimeType(ext);

    // Upload using direct fetch
    await uploadFileDirect('agreements', path, newSignedFile, contentType);
    
    updateFields.signed_file_path = path;
    if (agreement.signed_file_path) {
      oldPathsToDelete.push(agreement.signed_file_path);
    }
  } else if (clearSignedFile) {
    updateFields.signed_file_path = null;
    if (agreement.signed_file_path) {
      oldPathsToDelete.push(agreement.signed_file_path);
    }
  }

  // 4. Update row in DB
  const { data, error } = await supabase
    .from('agreements')
    .update(updateFields)
    .eq('id', agreementId)
    .select()
    .single();

  if (error) {
    // If update failed, clean up newly uploaded files to prevent orphaned files in storage
    const newPaths = [];
    if (updateFields.file_path) newPaths.push(updateFields.file_path);
    if (updateFields.signed_file_path) newPaths.push(updateFields.signed_file_path);
    if (newPaths.length > 0) {
      await supabase.storage.from('agreements').remove(newPaths);
    }
    throw error;
  }

  // 5. Clean up old files on successful DB update
  if (oldPathsToDelete.length > 0) {
    await supabase.storage.from('agreements').remove(oldPathsToDelete);
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
