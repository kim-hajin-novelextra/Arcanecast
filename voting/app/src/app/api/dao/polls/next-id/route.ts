// API Route: Get Next Available Poll ID (Atomic)
// GET /api/dao/polls/next-id - Returns next available onchain_id atomically

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Buffer } from 'buffer';
import { Connection, PublicKey } from '@solana/web3.js';
import { RPC_ENDPOINT, VOTING_PROGRAM_ID } from '@/config/constants';

// Derive poll PDA the same way as the on-chain program
function deriveMultiOptionPollPDA(pollId: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('multi_poll'), Buffer.from(new Uint8Array(new Uint32Array([pollId]).buffer))],
    VOTING_PROGRAM_ID
  )[0];
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Get max ID from database as starting point
    const { data: polls, error: queryError } = await supabaseAdmin
      .from('dao_polls')
      .select('onchain_id')
      .not('onchain_id', 'is', null)
      .order('onchain_id', { ascending: false })
      .limit(1);

    if (queryError) {
      console.error('Error querying database:', queryError);
    }
    const dbMaxId = polls && polls.length > 0 ? polls[0].onchain_id : -1;

    // Connect to Solana RPC to verify which IDs are really free on-chain
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    // Start from the database max + 1, but keep scanning forward until we find a free PDA
    let candidateId = (dbMaxId ?? -1) + 1;
    let attempts = 0;
    const maxScan = 200; // Prevent unbounded loops when chain is saturated

    while (attempts < maxScan) {
      const pollPda = deriveMultiOptionPollPDA(candidateId);
      const accountInfo = await connection.getAccountInfo(pollPda, 'confirmed');

      if (!accountInfo) {
        // Found the first free slot on-chain
        return NextResponse.json({
          nextId: candidateId,
          note: 'Chosen by scanning both database and on-chain state',
        });
      }

      candidateId++;
      attempts++;
    }

    console.error('next-id scan exhausted range without finding a free slot');
    return NextResponse.json(
      { error: 'No available poll IDs found in scan range. Try again shortly.' },
      { status: 503 }
    );

  } catch (error) {
    console.error('Error in GET /api/dao/polls/next-id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
