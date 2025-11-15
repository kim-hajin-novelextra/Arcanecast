'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { DAOVotingService } from '@/services/daoVotingService';
import toast from 'react-hot-toast';

interface DAOPoll {
  id: string;
  question: string;
  options: string[];
  selection_count: number;
  created_at: string;
  creator_wallet: string;
}

interface Selection {
  id: string;
  poll_id: string;
}

type SortOption = 'newest' | 'popular' | 'oldest';

export default function NominationSection() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const wallet = useWallet();
  const [polls, setPolls] = useState<DAOPoll[]>([]);
  const [mySelections, setMySelections] = useState<Selection[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [selectingPollId, setSelectingPollId] = useState<string | null>(null);
  const [convertingPollId, setConvertingPollId] = useState<string | null>(null);
  const [lastConvertTime, setLastConvertTime] = useState<number>(0);

  const remainingSelections = 5 - mySelections.length;
  const isAdmin = publicKey?.toString() === 'CzQKWMvkvw5PMqQ7gLFbzZoqe65dWbxyH1TrQsho4tpa';

  // Fetch nominations
  useEffect(() => {
    fetchPolls();
  }, [sortBy]);

  // Fetch user selections
  useEffect(() => {
    if (connected && publicKey) {
      fetchMySelections();
    } else {
      setMySelections([]);
    }
  }, [connected, publicKey]);

  const fetchPolls = async () => {
    try {
      const response = await fetch(`/api/dao/polls?section=nomination&sort=${sortBy}`);
      if (!response.ok) throw new Error('Failed to fetch polls');
      const data = await response.json();
      setPolls(data.polls || []);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast.error('Failed to load nominations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMySelections = async () => {
    if (!publicKey) return;
    
    try {
      const response = await fetch(`/api/dao/selections?wallet=${publicKey.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch selections');
      const data = await response.json();
      setMySelections(data.selections || []);
    } catch (error) {
      console.error('Error fetching selections:', error);
    }
  };

  const isSelected = (pollId: string) => {
    return mySelections.some(s => s.poll_id === pollId);
  };

  const handleSelect = async (pollId: string) => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (remainingSelections <= 0) {
      toast.error('You can only select 5 proposals per week');
      return;
    }

    setSelectingPollId(pollId);

    try {
      const response = await fetch('/api/dao/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poll_id: pollId,
          wallet: publicKey.toString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to select poll');
      }

      const data = await response.json();
      toast.success('+1 point earned!');
      
      // Update local state
      setMySelections([...mySelections, data.selection]);
      setPolls(polls.map(p => 
        p.id === pollId ? { ...p, selection_count: p.selection_count + 1 } : p
      ));
    } catch (error: any) {
      console.error('Error selecting poll:', error);
      toast.error(error.message || 'Failed to select poll');
    } finally {
      setSelectingPollId(null);
    }
  };

  const handleDeselect = async (pollId: string) => {
    if (!connected || !publicKey) return;

    const selection = mySelections.find(s => s.poll_id === pollId);
    if (!selection) return;

    setSelectingPollId(pollId);

    try {
      const response = await fetch(`/api/dao/selections/${selection.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to deselect poll');
      }

      toast.success('Selection removed');
      
      // Update local state
      setMySelections(mySelections.filter(s => s.poll_id !== pollId));
      setPolls(polls.map(p => 
        p.id === pollId ? { ...p, selection_count: p.selection_count - 1 } : p
      ));
    } catch (error: any) {
      console.error('Error deselecting poll:', error);
      toast.error(error.message || 'Failed to deselect poll');
    } finally {
      setSelectingPollId(null);
    }
  };

  const handleAdminConvert = async (pollId: string) => {
    if (!isAdmin) {
      toast.error('Unauthorized');
      return;
    }

    if (!connected || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    // Prevent rapid double-clicks (5 second cooldown)
    const now = Date.now();
    if (now - lastConvertTime < 5000) {
      toast.error('Please wait a moment before converting another poll');
      return;
    }

    const poll = polls.find(p => p.id === pollId);
    if (!poll) {
      toast.error('Poll not found');
      return;
    }

    if (!confirm(`Convert "${poll.question}" to an on-chain voting poll?`)) {
      return;
    }

    setConvertingPollId(pollId);
    setLastConvertTime(now);

    try {
      // Get next available on-chain ID from dedicated API endpoint (atomic)
      const nextIdResponse = await fetch('/api/dao/polls/next-id');
      if (!nextIdResponse.ok) {
        throw new Error('Failed to get next poll ID');
      }
      const { nextId: initialNextId } = await nextIdResponse.json();
      let nextId = initialNextId;

      console.log(`[Admin Convert] Got next available ID: ${nextId}`);

      // Create poll on-chain using service
      const votingService = new DAOVotingService(connection, wallet);
      
      // Try to create poll with exponential backoff if ID conflicts
      let tx: string | undefined;
      let success = false;
      let retries = 0;
      const maxRetries = 10;
      
      while (retries < maxRetries) {
        try {
          console.log(`[Admin Convert] Attempt ${retries + 1}: Creating poll with ID ${nextId}`);
          tx = await votingService.createMultiOptionPoll(
            nextId,
            poll.question,
            poll.options
          );
          console.log(`[Admin Convert] Success! Transaction: ${tx}`);
          success = true;
          break; // Success, exit loop
        } catch (error: any) {
          // Log full error for debugging
          console.log('[Admin Convert] Caught error:', error);
          console.log('[Admin Convert] Error message:', error.message);
          console.log('[Admin Convert] Error transactionMessage:', error.transactionMessage);
          console.log('[Admin Convert] Error logs:', error.logs || error.transactionLogs);
          
          // Check both the error message and the underlying transaction message/logs
          const errorMsg = (error.message?.toLowerCase() || '');
          const txMsg = (error.transactionMessage?.toLowerCase() || '');
          const logs = (error.logs?.join(' ') || error.transactionLogs?.join(' ') || '').toLowerCase();
          const combinedError = `${errorMsg} ${txMsg} ${logs}`;
          
          // Check if it's an "already processed" or duplicate transaction error
          if (combinedError.includes('already been processed') || 
              combinedError.includes('this transaction has already been processed') ||
              combinedError.includes('duplicate') ||
              combinedError.includes('blockhash not found')) {
            // First confirm whether the poll now exists on-chain (in case our tx actually landed)
            const status = await votingService.checkPollCreationStatus(nextId);
            if (status.exists) {
              tx = status.signature;
              console.log(`[Admin Convert] Poll ${nextId} detected on-chain after duplicate warning. Treating as success.`);
              success = true;
              break;
            }
            console.log(`[Admin Convert] Transaction conflict on attempt ${retries + 1}, waiting for new slot...`);
            // Wait longer to ensure we get a fresh blockhash: 1s, 2s, 4s, 8s...
            const waitTime = Math.min(1000 * Math.pow(2, retries), 10000); // Cap at 10 seconds
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retries++;
            // DON'T continue here - just retry with same ID since transaction didn't go through
            continue;
          }
          
          // Check if poll ID already exists (check both error message and logs)
          if (combinedError.includes('already in use') || 
              combinedError.includes('allocate') ||
              combinedError.includes('custom program error: 0x0') ||
              combinedError.includes('0x0')) {
            const status = await votingService.checkPollCreationStatus(nextId);
            if (status.exists) {
              tx = status.signature;
              console.log(`[Admin Convert] Poll ${nextId} confirmed on-chain. Treating as success.`);
              success = true;
              break;
            }
            console.log(`[Admin Convert] Poll ID ${nextId} exists, trying ${nextId + 1}`);
            nextId++;
            retries = 0; // Reset retry counter for new poll ID
            // Small delay to avoid hammering
            await new Promise(resolve => setTimeout(resolve, 200));
            continue; // Continue loop instead of falling through
          }
          
          // Different error, re-throw
          console.error('[Admin Convert] Unhandled error creating poll:', error);
          throw error;
        }
      }
      
      if (!success) {
        throw new Error(`Failed to create poll after repeated transaction conflicts. Please wait a few seconds and try again.`);
      }

      const txDisplay = tx && tx.length > 0 ? tx : '(signature unavailable)';
      console.log(`[Admin Convert] Poll created on-chain with ID ${nextId}: ${txDisplay}`);

      // Update database - move to voting section
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7); // 7 days from now

      const updateResponse = await fetch('/api/dao/polls', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pollId,
          section: 'voting',
          status: 'voting',
          onchain_id: nextId,
          deadline: deadline.toISOString(),
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update poll in database');
      }

      toast.success(
        <div>
          <div>✅ Poll converted to voting!</div>
          <div className="text-xs mt-1 opacity-75">
            On-chain ID: {nextId}
          </div>
          {tx ? (
            <a
              href={`https://explorer.solana.com/tx/${tx}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline mt-1 block"
            >
              View transaction
            </a>
          ) : (
            <div className="text-xs mt-1 italic opacity-60">
              Signature unavailable, but poll account verified on-chain.
            </div>
          )}
        </div>,
        { duration: 6000 }
      );

      // Remove from local state
      setPolls(polls.filter(p => p.id !== pollId));
    } catch (error: any) {
      console.error('Error converting poll:', error);
      toast.error(error.message || 'Failed to convert poll');
    } finally {
      setConvertingPollId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Selection Counter */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Nomination Proposals</h2>
          <p className="text-gray-400 text-sm mt-1">
            Top 5 most selected proposals advance to voting on Monday
          </p>
        </div>

        {connected && (
          <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-lg px-6 py-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {remainingSelections}
                <span className="text-lg text-gray-400">/5</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Selections remaining
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sort Options */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSortBy('newest')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            sortBy === 'newest'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Newest
        </button>
        <button
          onClick={() => setSortBy('popular')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            sortBy === 'popular'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Most Popular
        </button>
        <button
          onClick={() => setSortBy('oldest')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            sortBy === 'oldest'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Oldest
        </button>
      </div>

      {/* Polls List */}
      {polls.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">No proposals yet</p>
          <p className="text-gray-500 text-sm mt-2">Be the first to propose!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => {
            const selected = isSelected(poll.id);
            const isProcessing = selectingPollId === poll.id;

            return (
              <div
                key={poll.id}
                className={`bg-gray-800/50 border rounded-xl p-6 backdrop-blur-sm transition-all ${
                  selected
                    ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {/* Admin Badge */}
                {isAdmin && (
                  <div className="flex justify-end mb-2">
                    <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-400 text-xs font-semibold">
                      ADMIN
                    </span>
                  </div>
                )}

                {/* Question */}
                <h3 className="text-xl font-semibold text-white mb-4">
                  {poll.question}
                </h3>

                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                  {poll.options.map((option, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-300 text-sm"
                    >
                      {option}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="text-purple-400 font-semibold">
                        {poll.selection_count}
                      </span>
                      selections
                    </span>
                    <span>
                      {new Date(poll.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {connected ? (
                    <div className="flex items-center gap-2">
                      {/* Admin Convert Button */}
                      {isAdmin && (
                        <button
                          onClick={() => handleAdminConvert(poll.id)}
                          disabled={convertingPollId === poll.id}
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
                        >
                          {convertingPollId === poll.id ? 'Converting...' : '⚡ Convert to Voting'}
                        </button>
                      )}

                      {/* Select/Deselect Button */}
                      {selected ? (
                        <button
                          onClick={() => handleDeselect(poll.id)}
                          disabled={isProcessing}
                          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isProcessing ? 'Removing...' : '✓ Selected'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSelect(poll.id)}
                          disabled={isProcessing || remainingSelections <= 0}
                          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? 'Selecting...' : 'Select'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      Connect wallet to select
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
