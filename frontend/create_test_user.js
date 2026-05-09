import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing since we are in a bare node script
const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    env[key] = value;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function createTestUser() {
  const email = 'admin@forgetrack.local';
  const password = 'password123';

  console.log(`\n🚀 ForgeTrack - User Creator`);
  console.log(`=============================`);
  console.log(`Target URL: ${env.VITE_SUPABASE_URL}`);
  console.log(`Attempting to create: ${email}...\n`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: 'Admin Mentor',
        role: 'mentor'
      }
    }
  });

  if (error) {
    if (error.message.includes('already registered') || error.status === 400) {
      console.log("ℹ️  Account already exists or signup is restricted.");
    } else {
      console.error("❌ Error:", error.message);
      return;
    }
  } else {
    console.log("✅ User signup initiated!");
  }

  console.log(`\nTRY LOGGING IN WITH:`);
  console.log(`---------------------------`);
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`---------------------------`);
  console.log(`\nIMPORTANT:`);
  console.log(`1. Go to your Supabase Dashboard.`);
  console.log(`2. Go to Authentication > Users.`);
  console.log(`3. If you see ${email}, click on it and select "Confirm User" (if it's not already confirmed).`);
  console.log(`4. ALSO: Go to Authentication > Settings and disable "Confirm email" if you want to skip this in the future.`);
}

createTestUser();
