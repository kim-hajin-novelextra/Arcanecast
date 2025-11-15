import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fgyhqvkxgbgahmpcvrpu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZneWhxdmt4Z2JnYWhtcGN2cnB1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ4Njg2NCwiZXhwIjoyMDc2MDYyODY0fQ.B5ixS774liQfsPESmpDYkgIrLEYAKTn8g-a3y5x0Jy4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearAllData() {
  console.log('🗑️  Clearing ALL data from database...\n');

  // Order matters due to foreign key constraints
  
  // 1. Delete DAO voting records
  const { error: daoVotingError } = await supabase
    .from('dao_voting_records')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000');

  if (daoVotingError && daoVotingError.code !== 'PGRST116') {
    console.error('❌ Error deleting dao_voting_records:', daoVotingError.message);
  } else {
    console.log('✅ Cleared DAO voting records');
  }

  // 2. Delete selections
  const { error: selectionsError } = await supabase
    .from('selections')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000');

  if (selectionsError && selectionsError.code !== 'PGRST116') {
    console.error('❌ Error deleting selections:', selectionsError.message);
  } else {
    console.log('✅ Cleared selections');
  }

  // 3. Delete DAO polls
  const { error: daoPollsError } = await supabase
    .from('dao_polls')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000');

  if (daoPollsError && daoPollsError.code !== 'PGRST116') {
    console.error('❌ Error deleting dao_polls:', daoPollsError.message);
  } else {
    console.log('✅ Cleared DAO polls');
  }

  // 4. Delete vote records (binary polls)
  const { error: voteRecordsError } = await supabase
    .from('vote_records')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000');

  if (voteRecordsError && voteRecordsError.code !== 'PGRST116') {
    console.error('❌ Error deleting vote_records:', voteRecordsError.message);
  } else {
    console.log('✅ Cleared vote records');
  }

  // 5. Delete poll stats
  const { error: pollStatsError } = await supabase
    .from('poll_stats')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000');

  if (pollStatsError && pollStatsError.code !== 'PGRST116') {
    console.error('❌ Error deleting poll_stats:', pollStatsError.message);
  } else {
    console.log('✅ Cleared poll stats');
  }

  // 6. Delete binary polls
  const { error: pollsError } = await supabase
    .from('polls')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000');

  if (pollsError && pollsError.code !== 'PGRST116') {
    console.error('❌ Error deleting polls:', pollsError.message);
  } else {
    console.log('✅ Cleared binary polls');
  }

  // 7. Delete point transactions
  const { error: pointTxnsError } = await supabase
    .from('point_transactions')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000');

  if (pointTxnsError && pointTxnsError.code !== 'PGRST116') {
    console.error('❌ Error deleting point_transactions:', pointTxnsError.message);
  } else {
    console.log('✅ Cleared point transactions');
  }

  // 8. Delete user points
  const { error: userPointsError } = await supabase
    .from('user_points')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000');

  if (userPointsError && userPointsError.code !== 'PGRST116') {
    console.error('❌ Error deleting user_points:', userPointsError.message);
  } else {
    console.log('✅ Cleared user points');
  }

  // 9. Reset members (keep them but reset points and activity)
  const { error: membersError } = await supabase
    .from('members')
    .update({ points: 0, last_active: new Date().toISOString() })
    .gte('id', '00000000-0000-0000-0000-000000000000');

  if (membersError && membersError.code !== 'PGRST116') {
    console.error('❌ Error resetting members:', membersError.message);
  } else {
    console.log('✅ Reset member points and activity');
  }

  console.log('\n✨ Database cleared! Fresh slate ready for testing.');
  console.log('📝 Note: Member accounts preserved but points reset to 0\n');
}

clearAllData().catch(console.error);
