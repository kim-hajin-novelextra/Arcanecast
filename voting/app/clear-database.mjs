import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fgyhqvkxgbgahmpcvrpu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZneWhxdmt4Z2JnYWhtcGN2cnB1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ4Njg2NCwiZXhwIjoyMDc2MDYyODY0fQ.B5ixS774liQfsPESmpDYkgIrLEYAKTn8g-a3y5x0Jy4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearDatabase() {
  console.log('🗑️  Clearing database...\n');

  // Delete all votes
  const { data: votes, error: votesError } = await supabase
    .from('votes')
    .delete()
    .neq('id', 0); // Delete all rows

  if (votesError && votesError.code !== 'PGRST116') {
    console.error('❌ Error deleting votes:', votesError);
  } else {
    console.log('✅ Cleared all votes');
  }

  // Delete all multi-option polls
  const { data: multiPolls, error: multiPollsError } = await supabase
    .from('multi_option_polls')
    .delete()
    .neq('id', 0);

  if (multiPollsError && multiPollsError.code !== 'PGRST116') {
    console.error('❌ Error deleting multi-option polls:', multiPollsError);
  } else {
    console.log('✅ Cleared all multi-option polls');
  }

  // Delete all nominations
  const { data: nominations, error: nominationsError } = await supabase
    .from('nominations')
    .delete()
    .neq('id', 0);

  if (nominationsError && nominationsError.code !== 'PGRST116') {
    console.error('❌ Error deleting nominations:', nominationsError);
  } else {
    console.log('✅ Cleared all nominations');
  }

  // Delete all polls
  const { data: polls, error: pollsError } = await supabase
    .from('polls')
    .delete()
    .neq('id', 0);

  if (pollsError && pollsError.code !== 'PGRST116') {
    console.error('❌ Error deleting polls:', pollsError);
  } else {
    console.log('✅ Cleared all binary polls');
  }

  console.log('\n✨ Database cleared! You have a clean slate.');
}

clearDatabase().catch(console.error);
