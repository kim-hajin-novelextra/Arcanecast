"use client";

import React, { useState, useEffect } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useArcium } from "@/contexts/ArciumContext";
import { VotingService } from "@/services/votingService";
import { MAX_QUESTION_LENGTH } from "@/config/constants";
import toast from "react-hot-toast";

export function CreatePollForm({ onPollCreated }: { onPollCreated?: () => void }) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { cipher, isReady } = useArcium();

  const [question, setQuestion] = useState("");
  const [nextPollId, setNextPollId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isFindingId, setIsFindingId] = useState(false);

  // Automatically find the next available poll ID when component mounts or wallet changes
  useEffect(() => {
    const findNextPollId = async () => {
      if (!wallet) {
        setNextPollId(null);
        return;
      }

      setIsFindingId(true);
      try {
        const votingService = new VotingService(connection, wallet);
        const polls = await votingService.fetchPollsByAuthority(wallet.publicKey);
        
        // Get all existing poll IDs for this authority
        const existingIds = polls.map(p => p.account.id);
        
        // Find the lowest available ID starting from 1
        let id = 1;
        while (existingIds.includes(id)) {
          id++;
        }
        
        setNextPollId(id);
      } catch (error) {
        console.error("Failed to find next poll ID:", error);
        // Default to 1 if we can't fetch existing polls
        setNextPollId(1);
      } finally {
        setIsFindingId(false);
      }
    };

    findNextPollId();
  }, [wallet, connection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet || !cipher || !isReady) {
      toast.error("Please connect wallet and wait for encryption to be ready");
      return;
    }

    if (nextPollId === null) {
      toast.error("Finding next available poll ID...");
      return;
    }

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      toast.error("Question cannot be empty");
      return;
    }

    if (trimmedQuestion.length > MAX_QUESTION_LENGTH) {
      toast.error(`Question must be ${MAX_QUESTION_LENGTH} characters or less`);
      return;
    }

    setIsCreating(true);

    try {
      const votingService = new VotingService(connection, wallet);
      const signature = await votingService.createPoll(
        nextPollId,
        trimmedQuestion,
        cipher
      );

      console.log("Poll created with signature:", signature);
      toast.success(`Poll ${nextPollId} created successfully!`);

      setQuestion("");
      
      // Find next available ID again after successful creation
      setIsFindingId(true);
      const polls = await votingService.fetchPollsByAuthority(wallet.publicKey);
      const existingIds = polls.map(p => p.account.id);
      let id = 1;
      while (existingIds.includes(id)) {
        id++;
      }
      setNextPollId(id);
      setIsFindingId(false);
      
      if (onPollCreated) {
        onPollCreated();
      }
    } catch (error: any) {
      console.error("Failed to create poll:", error);
      toast.error(`Failed to create poll: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20 shadow-2xl">
      <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        Create Confidential Poll
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Poll ID (Auto-assigned)
          </label>
          <div className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-xl text-gray-400 flex items-center justify-between">
            {isFindingId ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                Finding next available ID...
              </span>
            ) : nextPollId !== null ? (
              <span>#{nextPollId}</span>
            ) : (
              <span>Connect wallet to see next ID</span>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Poll ID is automatically assigned to the lowest available number
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Question ({question.length}/{MAX_QUESTION_LENGTH})
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Is Satoshi an alien?"
            maxLength={MAX_QUESTION_LENGTH}
            className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
            disabled={isCreating}
            required
          />
          <p className="mt-2 text-xs text-gray-400">
            Voters will answer AGREE or DISAGREE to this question
          </p>
        </div>

        {!isReady && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <p className="text-sm text-yellow-400">
              Waiting for encryption to initialize...
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!isReady || isCreating || !wallet || nextPollId === null}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold text-white shadow-lg hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
        >
          {isCreating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating Poll...
            </span>
          ) : (
            "Create Poll"
          )}
        </button>
      </form>

      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
        <h3 className="text-sm font-semibold text-blue-400 mb-2">Privacy Features</h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>✓ All votes are encrypted end-to-end</li>
          <li>✓ Vote tallies remain confidential until you reveal them</li>
          <li>✓ Only you (the creator) can reveal results</li>
          <li>✓ Powered by secure multi-party computation</li>
        </ul>
      </div>
    </div>
  );
}
