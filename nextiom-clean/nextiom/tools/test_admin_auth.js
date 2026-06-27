// Diagnostic script — credentials must be passed via environment variables, never hardcoded.
// Usage: SUPABASE_ACCESS_TOKEN=sbp_... SUPABASE_PROJECT_REF=your_ref node tools/test_admin_auth.js

const ref   = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!ref || !token) {
  console.error('Error: Set SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN environment variables.');
  process.exit(1);
}

async function run() {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: `
              SELECT email, encrypted_password
              FROM auth.users
              WHERE email IN ('admin@nextiom.com', 'nextiomwp@gmail.com', 'info@nextiom.com');
            `
        })
    });
    console.log('Query result:', res.status, await res.json());
}
run();
