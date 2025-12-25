import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Configuration
const ENV_PATH = path.resolve(process.cwd(), '.env.local');

// Load environment variables manually
const envContent = fs.readFileSync(ENV_PATH, 'utf8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.trim();
});

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_KEY = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verify() {
    console.log('🔍 Verifying Migration Data...\n');

    // 1. Check Counts
    const tables = ['players', 'courses', 'rounds', 'round_players', 'handicap_rounds', 'scores'];
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) console.error(`❌ Error counting ${table}:`, error.message);
        else console.log(`✅ ${table}: ${count} rows`);
    }

    // 2. Sample Player Check
    console.log('\n👤 Sample Player Check (Viet):');
    const { data: player, error: pError } = await supabase
        .from('players')
        .select('name, index, low_handicap_index')
        .ilike('name', '%Viet%') // Adjust if name is different
        .limit(1)
        .single();

    if (pError) {
        console.log('⚠️ Could not find player "Viet" to verify.');
    } else {
        console.log(`   Name: ${player.name}`);
        console.log(`   Current Index: ${player.index}`);
        console.log(`   Low HI: ${player.low_handicap_index}`);
    }

    console.log('\n🏁 Verification Complete.');
}

verify();
