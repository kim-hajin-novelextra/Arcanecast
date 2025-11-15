import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { pollId: string } }
) {
  try {
    const { voteCounts, revealedBy, transactionSignature } = await request.json();

    if (!voteCounts || !Array.isArray(voteCounts)) {
      return NextResponse.json(
        { error: 'Vote counts array required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Update the poll with vote counts and mark as completed
    const { data: poll, error } = await supabaseAdmin
      .from('dao_polls')
      .update({
        vote_counts: voteCounts,
        status: 'completed',
        section: 'completed',
        revealed_at: new Date().toISOString(),
      })
      .eq('id', params.pollId)
      .select()
      .single();

    if (error) {
      console.error('Error updating poll:', error);
      return NextResponse.json(
        { error: 'Failed to update poll', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      poll,
      message: 'Poll results stored successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/dao/polls/[pollId]/reveal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
