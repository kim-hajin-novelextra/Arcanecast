"use client";

import React, { useState, useEffect } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { VotingService } from "@/services/votingService";
import { PollCard } from "./PollCard";
import { PublicKey } from "@solana/web3.js";
import toast from "react-hot-toast";
import { BN } from "@coral-xyz/anchor";

interface PollWithRevealStatus {
  bump: number;
  voteState: number[][];
  id: number;
  question: string;
  authority: PublicKey;
  nonce: BN;
  publicKey: PublicKey;
  isRevealed: boolean;
  createdAt?: number;
}

type StatusFilter = "all" | "ongoing" | "revealed";
type SortOrder = "newest" | "oldest";

export function PollList() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const [polls, setPolls] = useState<PollWithRevealStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const fetchPolls = async () => {
    if (!wallet) return;

    setLoading(true);
    try {
      const votingService = new VotingService(connection, wallet);
      
      // Fetch ALL polls (globally accessible)
      const fetchedPolls = await votingService.fetchAllPolls();

      // Fetch reveal status for each poll
      const pollsWithStatus = await Promise.all(
        fetchedPolls.map(async (p) => {
          let isRevealed = false;
          try {
            const response = await fetch(`/api/polls/${p.account.id}/reveal`);
            if (response.ok) {
              const status = await response.json();
              isRevealed = status.isRevealed;
            }
          } catch (error) {
            console.error(`Failed to fetch reveal status for poll ${p.account.id}:`, error);
          }

          return {
            ...p.account,
            publicKey: p.publicKey,
            isRevealed,
          };
        })
      );

      setPolls(pollsWithStatus);
    } catch (error: any) {
      console.error("Failed to fetch polls:", error);
      // Don't show error toast for empty results
      if (!error.message?.includes("Account does not exist")) {
        toast.error("Failed to fetch polls");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, [wallet, connection]);

  // Filter and sort polls
  const filteredAndSortedPolls = React.useMemo(() => {
    let result = [...polls];

    // Apply status filter
    if (statusFilter === "ongoing") {
      result = result.filter(poll => !poll.isRevealed);
    } else if (statusFilter === "revealed") {
      result = result.filter(poll => poll.isRevealed);
    }

    // Apply sort order
    result.sort((a, b) => {
      // Sort by poll ID as a proxy for creation time
      if (sortOrder === "newest") {
        return b.id - a.id;
      } else {
        return a.id - b.id;
      }
    });

    return result;
  }, [polls, statusFilter, sortOrder]);

  if (!wallet) {
    return (
      <div className="text-center py-12">
        <div className="inline-block p-8 bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl border border-purple-500/20">
          <h3 className="text-xl font-bold text-white mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-gray-400">
            Connect your wallet to view and participate in polls
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Section */}
      <div className="mb-8 p-6 bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-2xl border border-gray-700/50">
        <h3 className="text-lg font-bold text-white mb-4">Filter & Sort</h3>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
            >
              <option value="all">All Polls</option>
              <option value="ongoing">Ongoing</option>
              <option value="revealed">Revealed</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sort By
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {/* Refresh Button */}
          <div className="flex items-end">
            <button
              onClick={fetchPolls}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded-xl font-semibold text-white transition-all whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading...
                </span>
              ) : (
                "Refresh"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Polls Grid */}
      {loading && polls.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Loading polls...</p>
        </div>
      ) : filteredAndSortedPolls.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block p-8 bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-2xl border border-gray-700/50">
            <h3 className="text-xl font-bold text-white mb-2">No Polls Found</h3>
            <p className="text-gray-400">
              {statusFilter === "ongoing" 
                ? "No ongoing polls at the moment"
                : statusFilter === "revealed"
                ? "No revealed polls yet"
                : "Create your first poll to get started!"}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Ongoing Polls Section */}
          {statusFilter === "all" && filteredAndSortedPolls.some(p => !p.isRevealed) && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                Ongoing Polls
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredAndSortedPolls
                  .filter(poll => !poll.isRevealed)
                  .map((poll) => (
                    <PollCard key={poll.publicKey.toBase58()} poll={poll} onUpdate={fetchPolls} />
                  ))}
              </div>
            </div>
          )}

          {/* Revealed Polls Section */}
          {statusFilter === "all" && filteredAndSortedPolls.some(p => p.isRevealed) && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-indigo-500 rounded-full" />
                Revealed Polls
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredAndSortedPolls
                  .filter(poll => poll.isRevealed)
                  .map((poll) => (
                    <PollCard key={poll.publicKey.toBase58()} poll={poll} onUpdate={fetchPolls} />
                  ))}
              </div>
            </div>
          )}

          {/* Single Section for Filtered View */}
          {statusFilter !== "all" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredAndSortedPolls.map((poll) => (
                <PollCard key={poll.publicKey.toBase58()} poll={poll} onUpdate={fetchPolls} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
