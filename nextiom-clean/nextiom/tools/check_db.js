import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fewhvlsqkbsmqbrqclya.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZld2h2bHNxa2JzbXFicnFjbHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDIyODEsImV4cCI6MjA4NTY3ODI4MX0.3_rloCyJNjU3e2CxqKnsBy8vhmTSkTG2SqOPMN3evSM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .from('customers')
    .select('activities_cleared_at')
    .limit(1);

  if (error) {
    console.error('Error fetching activities_cleared_at:', error);
  } else {
    console.log('Successfully fetched activities_cleared_at:', data);
  }
}

check();
