import { supabase } from './customSupabaseClient';

/**
 * Fetch all jobs with customer details (for Admin)
 */
export async function getJobs() {
  const { data, error } = await supabase
    .from('jobs')
    .select('*, customers(id, name, email, company)')
    .order('created_date', { ascending: false });

  if (error) {
    console.error('Error fetching jobs:', error);
    throw error;
  }
  return data || [];
}

/**
 * Fetch jobs for a specific customer
 */
export async function getCustomerJobs(customerId) {
  const { data, error } = await supabase
    .from('jobs')
    .select('*, customers(id, name, email, company)')
    .eq('customer_id', customerId)
    .order('created_date', { ascending: false });

  if (error) {
    console.error('Error fetching customer jobs:', error);
    throw error;
  }
  return data || [];
}

/**
 * Create a new job
 */
export async function createJob(jobData) {
  const { data, error } = await supabase
    .from('jobs')
    .insert([jobData])
    .select()
    .single();

  if (error) {
    console.error('Error creating job:', error);
    throw error;
  }
  return data;
}

/**
 * Update an existing job
 */
export async function updateJob(jobId, jobData) {
  const { data, error } = await supabase
    .from('jobs')
    .update(jobData)
    .eq('id', jobId)
    .select()
    .single();

  if (error) {
    console.error('Error updating job:', error);
    throw error;
  }
  return data;
}

/**
 * Delete a job
 */
export async function deleteJob(jobId) {
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId);

  if (error) {
    console.error('Error deleting job:', error);
    throw error;
  }
  return true;
}

/**
 * Fetch the job queue settings
 */
export async function getJobSettings() {
  const { data, error } = await supabase
    .from('job_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching job settings:', error);
    throw error;
  }

  // If settings don't exist for some reason, return defaults
  if (!data) {
    return {
      id: 1,
      show_custom_active_jobs: false,
      custom_active_jobs_count: 15,
      max_concurrent_jobs: 10,
      display_queue_to_customers: true,
      display_active_job_count: true,
      display_queue_position: true,
      auto_sort_jobs_in_queue: true,
      queue_position_mode: 'automatic',
    };
  }

  return data;
}

/**
 * Update job queue settings
 */
export async function updateJobSettings(settingsData) {
  const { data, error } = await supabase
    .from('job_settings')
    .update({
      ...settingsData,
      updated_at: new Date().toISOString()
    })
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    console.error('Error updating job settings:', error);
    throw error;
  }
  return data;
}
