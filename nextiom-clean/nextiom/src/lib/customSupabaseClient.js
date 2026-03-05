import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fewhvlsqkbsmqbrqclya.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZld2h2bHNxa2JzbXFicnFjbHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDIyODEsImV4cCI6MjA4NTY3ODI4MX0.3_rloCyJNjU3e2CxqKnsBy8vhmTSkTG2SqOPMN3evSM';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
