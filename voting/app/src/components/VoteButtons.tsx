"use client";

import React, { useState, useEffect } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useArcium } from "@/contexts/ArciumContext";
import { VotingService } from "@/services/votingService";
import { PollAccount, VoteState } from "@/types";
import { PublicKey } from "@solana/web3.js";
import toast from "react-hot-toast";
import { hasVoted as checkHasVoted, getVote as getStoredVote, saveVote as saveVoteToStorage } from "@/utils/voteStorage";

interface VoteButtonsProps {
  poll: PollAccount & { publicKey: PublicKey };
  onVoteCast?: () => void;
  isRevealed?: boolean;
}

export function VoteButtons({ poll, onVoteCast, isRevealed = false }: VoteButtonsProps) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { cipher, clientPublicKey, isReady } = useArcium();

  const [voteState, setVoteState] = useState<VoteState | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<boolean | null>(null);

  // Check if user has already voted on mount and when wallet changes
  useEffect(() => {
    if (wallet?.publicKey) {
      const voted = checkHasVoted(poll.authority.toString(), poll.id);
      setHasVoted(voted);
      if (voted) {
        const voteRecord = getStoredVote(poll.authority.toString(), poll.id);
        setUserVote(voteRecord ? voteRecord.vote === "yes" : null);
      }
    }
  }, [poll.id, poll.authority, wallet?.publicKey]);

  const handleVote = async (choice: boolean) => {
    if (!wallet || !cipher || !clientPublicKey || !isReady) {
      toast.error("Encryption not ready");
      return;
    }

    // Check if already voted
    if (hasVoted) {
      const existingVote = getStoredVote(poll.authority.toString(), poll.id);
      const voteType = existingVote?.vote === "yes" ? "AGREE" : "DISAGREE";
      toast.error(`You have already voted ${voteType} on this poll`);
      return;
    }

    const toastId = toast.loading(
      choice ? "Casting AGREE vote..." : "Casting DISAGREE vote..."
    );

    try {
      setVoteState({
        pollId: poll.id,
        computationOffset: null as any,
        status: "encrypting",
        txSignatures: {},
      });

      const votingService = new VotingService(connection, wallet);

      const signature = await votingService.castVote(
        poll.id,
        choice,
        cipher,
        clientPublicKey,
        poll.authority,
        (state) => {
          setVoteState(state);

          if (state.status === "queued") {
            toast.loading("Vote encrypted, queuing computation...", {
              id: toastId,
            });
          } else if (state.status === "processing") {
            toast.loading("Secure computation in progress...", { id: toastId });
          }
        }
      );

      // Save the vote to localStorage
      saveVoteToStorage(
        poll.authority.toString(),
        poll.id,
        choice ? "yes" : "no",
        signature
      );

      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
      toast.success(
        <div>
          <p>{choice ? "AGREE" : "DISAGREE"} vote confirmed! Your vote is encrypted onchain.</p>
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">
            View Transaction
          </a>
        </div>,
        { id: toastId, duration: 7000 }
      );

      setHasVoted(true);
      setUserVote(choice);
      setVoteState(null);
      onVoteCast?.();
    } catch (error: any) {
      console.error("Failed to cast vote:", error);
      toast.error(error?.message || "Failed to cast vote", { id: toastId });
      setVoteState(null);
    }
  };

  const isVoting = voteState !== null;

  // Don't show buttons if poll is revealed
  if (isRevealed) {
    return null;
  }

  if (hasVoted) {
    return (
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-400/40">
            <span className="text-emerald-400 font-bold">✓</span>
          </div>
          <div>
            <p className="font-semibold text-emerald-300 text-sm">Vote Cast Successfully</p>
            <p className="text-xs text-gray-400">
              Your encrypted vote has been recorded
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Show if user has already voted */}
      {hasVoted && userVote !== null && (
        <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <p className="text-xs text-purple-300">
            You voted <strong>{userVote ? "AGREE" : "DISAGREE"}</strong> on this poll
          </p>
        </div>
      )}

      {isVoting && voteState && (
        <div className="p-4 bg-gradient-to-r from-indigo-500/15 to-blue-500/15 border border-indigo-400/30 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-indigo-300/40 border-t-indigo-300 rounded-full animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-indigo-300">
                {voteState.status === "encrypting" && "Encrypting your vote..."}
                {voteState.status === "queued" && "Submitting to blockchain..."}
                {voteState.status === "processing" && "Secure computation in progress..."}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Ensuring complete confidentiality
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleVote(true)}
          disabled={!isReady || isVoting || !wallet}
          className="py-3 px-4 bg-gradient-to-br from-purple-700 to-purple-800 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed rounded-xl font-bold text-white text-sm shadow-lg hover:shadow-purple-500/40 transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100 border border-purple-500/30 disabled:border-gray-600"
        >
          AGREE
        </button>

        <button
          onClick={() => handleVote(false)}
          disabled={!isReady || isVoting || !wallet}
          className="py-3 px-4 bg-gradient-to-br from-indigo-800 to-slate-800 hover:from-indigo-700 hover:to-slate-700 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed rounded-xl font-bold text-white text-sm shadow-lg hover:shadow-indigo-500/40 transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100 border border-indigo-500/30 disabled:border-gray-600"
        >
          DISAGREE
        </button>
      </div>

      {!isReady && (
        <p className="text-xs text-center text-amber-400">
          Initializing encryption...
        </p>
      )}
    </div>
  );
}
