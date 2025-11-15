import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fgyhqvkxgbgahmpcvrpu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZneWhxdmt4Z2JnYWhtcGN2cnB1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ4Njg2NCwiZXhwIjoyMDc2MDYyODY0fQ.B5ixS774liQfsPESmpDYkgIrLEYAKTn8g-a3y5x0Jy4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  const tables = ['polls', 'vote_records', 'active_nominations', 'current_voting_polls', 'completed_polls'];
  
  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: false });
    
    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${count || data?.length || 0} records`);
    }
  }
}

checkTables().catch(console.error);
