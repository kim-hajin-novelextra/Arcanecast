"use client";

import React, { useState, useEffect } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { VotingService } from "@/services/votingService";
import { PollAccount, RevealState } from "@/types";
import { PublicKey } from "@solana/web3.js";
import toast from "react-hot-toast";

interface RevealResultsProps {
  poll: PollAccount & { publicKey: PublicKey };
  onResultRevealed?: () => void;
}

interface RevealStatus {
  isRevealed: boolean;
  revealedAt?: string;
  winner?: 'yes' | 'no';
  totalVotes?: number;
}

export function RevealResults({ poll, onResultRevealed }: RevealResultsProps) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const [revealState, setRevealState] = useState<RevealState | null>(null);
  const [result, setResult] = useState<boolean | null>(null);
  const [dbRevealStatus, setDbRevealStatus] = useState<RevealStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const isAuthority = wallet?.publicKey.equals(poll.authority);

  // Fetch reveal status from database on mount
  useEffect(() => {
    const fetchRevealStatus = async () => {
      try {
        const response = await fetch(`/api/polls/${poll.id}/reveal`);
        if (response.ok) {
          const status: RevealStatus = await response.json();
          setDbRevealStatus(status);
          
          // If already revealed in DB, set the result
          if (status.isRevealed && status.winner) {
            setResult(status.winner === 'yes');
          }
        } else if (response.status === 404) {
          // Poll exists on-chain but not in database (created before DB integration)
          // This is OK - just means no reveal status yet
          console.log(`Poll ${poll.id} not found in database (on-chain only)`);
          setDbRevealStatus({ isRevealed: false });
        }
      } catch (error) {
        console.error('Failed to fetch reveal status:', error);
        // Set default state on error
        setDbRevealStatus({ isRevealed: false });
      } finally {
        setLoadingStatus(false);
      }
    };

    fetchRevealStatus();
  }, [poll.id]);

  const handleReveal = async () => {
    if (!wallet) {
      toast.error("Wallet not connected");
      return;
    }

    if (!isAuthority) {
      toast.error("Only the poll creator can reveal results");
      return;
    }

    const toastId = toast.loading("Revealing results...");

    try {
      setRevealState({
        pollId: poll.id,
        computationOffset: null as any,
        status: "queued",
      });

      const votingService = new VotingService(connection, wallet);

      const revealedResult = await votingService.revealResults(
        poll.id,
        (state) => {
          setRevealState(state);

          if (state.status === "queued") {
            toast.loading("Queuing reveal computation...", { id: toastId });
          } else if (state.status === "processing") {
            toast.loading("Decrypting votes...", { id: toastId });
          }
        }
      );

      setResult(revealedResult);
      
      // Refetch reveal status from database to confirm storage
      const statusResponse = await fetch(`/api/polls/${poll.id}/reveal`);
      if (statusResponse.ok) {
        const status: RevealStatus = await statusResponse.json();
        setDbRevealStatus(status);
      }
      
      toast.success("Results revealed!", { id: toastId });
      onResultRevealed?.();
    } catch (error: any) {
      console.error("Failed to reveal results:", error);
      toast.error(error?.message || "Failed to reveal results", { id: toastId });
    } finally {
      setRevealState(null);
    }
  };

  // Loading state while checking database
  if (loadingStatus) {
    return (
      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
        <p className="text-sm text-gray-400 text-center">
          Loading reveal status...
        </p>
      </div>
    );
  }

  // Show results if revealed (visible to EVERYONE)
  if (dbRevealStatus?.isRevealed || result !== null) {
    const winner = result !== null ? result : (dbRevealStatus?.winner === 'yes');
    
    return (
      <div className="p-4 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-violet-900/40 border border-purple-400/40 rounded-xl backdrop-blur-sm">
        <h3 className="text-lg font-bold mb-3 text-center bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
          Results Revealed
        </h3>
        <div className="text-center">
          <div
            className={`inline-block px-6 py-4 rounded-xl shadow-lg ${
              winner
                ? "bg-gradient-to-br from-purple-600/30 to-purple-700/30 border-2 border-purple-400/50"
                : "bg-gradient-to-br from-indigo-700/30 to-slate-700/30 border-2 border-indigo-400/50"
            }`}
          >
            <div className="text-xl font-black mb-1">
              {winner ? (
                <span className="text-purple-300">Majority AGREED</span>
              ) : (
                <span className="text-indigo-300">Majority DISAGREED</span>
              )}
            </div>
            <p className="text-sm text-gray-300 font-medium">
              Votes have been finalised
            </p>
          </div>
          {dbRevealStatus?.totalVotes && (
            <p className="text-xs text-gray-300 mt-3 font-medium">
              {dbRevealStatus.totalVotes} total participants
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Individual vote counts remain confidential
          </p>
          {dbRevealStatus?.revealedAt && (
            <p className="text-xs text-gray-500 mt-3">
              Revealed on {new Date(dbRevealStatus.revealedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (revealState) {
    return (
      <div className="p-5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
        <div className="flex items-center justify-center gap-3">
          <div className="w-7 h-7 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
          <div className="text-center">
            <p className="font-medium text-indigo-300 text-sm">
              {revealState.status === "queued" && "Queuing reveal computation..."}
              {revealState.status === "processing" && "Decrypting votes via MPC..."}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              This may take a few seconds
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthority) {
    return (
      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
        <p className="text-sm text-gray-400 text-center">
          Results can only be revealed by the poll creator
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={handleReveal}
      disabled={!wallet}
      className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold text-white text-sm shadow-lg hover:shadow-purple-500/40 transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100"
    >
      Reveal Results
    </button>
  );
}
