/**
 * Script to sync on-chain polls with database
 * Finds all polls on-chain and ensures database knows about them
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from app/.env.local
dotenv.config({ path: join(__dirname, '../app/.env.local') });

const PROGRAM_ID = new PublicKey('AEspuAAzEw9BNq2Qke45vakpPEcsoT7DhDzP6HHuiemU');
const RPC_URL = 'https://api.devnet.solana.com';

async function main() {
  console.log('🔍 Syncing on-chain polls with database...\n');

  // Connect to Solana
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Get Supabase credentials from env
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in app/.env.local');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Derive poll PDAs for IDs 0-50
  const existingPolls = [];
  
  console.log('Checking poll IDs 0-50 on-chain...\n');
  
  for (let id = 0; id <= 50; id++) {
    try {
      const [pollPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('multi_poll'),
          Buffer.from(new Uint8Array(new Uint32Array([id]).buffer))
        ],
        PROGRAM_ID
      );

      // Check if account exists
      const accountInfo = await connection.getAccountInfo(pollPDA);
      
      if (accountInfo) {
        console.log(`✓ Poll ID ${id} exists on-chain at ${pollPDA.toString()}`);
        existingPolls.push({ id, pda: pollPDA.toString() });
      } else {
        process.stdout.write('.');
      }
    } catch (error) {
      process.stdout.write('x');
    }
  }

  console.log(`\n\n📊 Found ${existingPolls.length} polls on-chain:\n`);
  existingPolls.forEach(p => {
    console.log(`   Poll ID ${p.id}`);
  });
  
  // Check which ones are in database
  console.log('\n🗄️  Checking database...\n');
  
  const { data: dbPolls, error } = await supabase
    .from('dao_polls')
    .select('id, onchain_id, question')
    .not('onchain_id', 'is', null)
    .order('onchain_id', { ascending: true });

  if (error) {
    console.error('❌ Error querying database:', error);
    process.exit(1);
  }

  console.log(`Found ${dbPolls?.length || 0} polls in database with onchain_id:\n`);
  dbPolls?.forEach(p => {
    console.log(`   Poll ID ${p.onchain_id}: "${p.question}"`);
  });

  const dbPollIds = new Set(dbPolls?.map(p => p.onchain_id) || []);
  const missingFromDb = existingPolls.filter(p => !dbPollIds.has(p.id));

  console.log('\n' + '='.repeat(60));
  
  if (missingFromDb.length === 0) {
    console.log('✅ Database is in sync with blockchain!');
    console.log('   All on-chain polls are recorded in the database.');
  } else {
    console.log(`⚠️  Found ${missingFromDb.length} polls on-chain but NOT in database:`);
    console.log('');
    missingFromDb.forEach(p => {
      console.log(`   ❌ Poll ID ${p.id} (${p.pda})`);
    });
    console.log('');
    console.log('💡 These polls were likely created during testing.');
    console.log('   The retry system will automatically skip these IDs.');
    console.log('');
    console.log(`📈 Next available ID should be: ${Math.max(...existingPolls.map(p => p.id)) + 1}`);
  }
  
  console.log('='.repeat(60));
}

main().catch(console.error);
