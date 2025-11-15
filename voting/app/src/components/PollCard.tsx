"use client";

import React, { useState, useEffect } from "react";
import { PollAccount } from "@/types";
import { PublicKey } from "@solana/web3.js";
import { VoteButtons } from "./VoteButtons";
import { RevealResults } from "./RevealResults";
import { shortenAddress } from "@/utils/helpers";

interface PollCardProps {
  poll: PollAccount & { publicKey: PublicKey };
  onUpdate?: () => void;
}

interface RevealStatus {
  isRevealed: boolean;
  revealedAt?: string;
  winner?: 'yes' | 'no';
  totalVotes?: number;
}

export function PollCard({ poll, onUpdate }: PollCardProps) {
  // Import at top of file: import { getVote } from "@/utils/voteStorage";
  const userVote = typeof window !== 'undefined' ? 
    require('@/utils/voteStorage').getVote(poll.authority, poll.id) : null;

  const [isRevealed, setIsRevealed] = useState(false);

  // Check if poll is revealed
  useEffect(() => {
    const fetchRevealStatus = async () => {
      try {
        const response = await fetch(`/api/polls/${poll.id}/reveal`);
        if (response.ok) {
          const status: RevealStatus = await response.json();
          setIsRevealed(status.isRevealed);
        }
      } catch (error) {
        console.error('Failed to fetch reveal status:', error);
      }
    };

    fetchRevealStatus();
  }, [poll.id]);

  return (
    <div className="bg-gradient-to-br from-slate-900/95 via-gray-900/95 to-slate-900/95 backdrop-blur-md rounded-2xl p-6 border border-gray-700/50 shadow-xl hover:border-purple-500/40 hover:shadow-purple-500/10 transition-all duration-300">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">{/* badges */}
              <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded-full">
                Poll #{poll.id}
              </span>
              {userVote && (
                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                  userVote.vote === 'yes' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' 
                    : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                }`}>
                  You voted: {userVote.vote === 'yes' ? 'AGREE' : 'DISAGREE'}
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-white leading-tight">{poll.question}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="font-medium">Creator:</span>
          <code className="px-2 py-1 bg-black/50 rounded text-purple-300 font-mono text-xs border border-purple-500/20">
            {shortenAddress(poll.authority)}
          </code>
        </div>
      </div>

      {/* Encrypted Vote State Indicator */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-400/30 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-purple-400/20 rounded-full flex items-center justify-center border border-purple-400/30">
              <svg className="w-5 h-5 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-purple-300">
              Confidential Voting Active
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              All votes encrypted • Tallies hidden until reveal
            </p>
          </div>
        </div>
      </div>

      {/* Vote Buttons */}
      <div className="mb-4">
        <VoteButtons poll={poll} onVoteCast={onUpdate} isRevealed={isRevealed} />
      </div>

      {/* Divider */}
      <div className="my-6 border-t border-gray-700/50" />

      {/* Reveal Results */}
      <RevealResults poll={poll} onResultRevealed={onUpdate} />
    </div>
  );
}
