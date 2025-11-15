'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/WalletButton';
import NominationSection from '@/components/NominationSection';
import VotingSection from '@/components/VotingSection';
import CompletedSection from '@/components/CompletedSection';
import ProposePollModal from '@/components/ProposePollModal';

type Section = 'nomination' | 'voting' | 'completed';

export default function DAOPage() {
  const { connected } = useWallet();
  const [activeSection, setActiveSection] = useState<Section>('nomination');
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePollCreated = () => {
    setRefreshKey(prev => prev + 1); // Trigger refresh
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black">
      {/* Header */}
      <header className="border-b border-purple-500/20 backdrop-blur-sm sticky top-0 z-50 bg-black/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                    VeiledCasts
                  </h1>
                  <p className="text-sm text-gray-300 font-medium">
                    Confidential Voting Powered by Arcium
                  </p>
                </div>
              </Link>
              
              {/* Navigation */}
              <nav className="hidden md:flex items-center gap-8">
                <Link 
                  href="/dao"
                  className="text-lg font-bold text-purple-400 hover:text-purple-300 transition-colors"
                >
                  DAO Governance
                </Link>
                <Link 
                  href="/"
                  className="text-lg font-bold text-gray-300 hover:text-purple-300 transition-colors"
                >
                  Opinions
                </Link>
              </nav>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              DAO Governance
            </h1>
            <p className="text-gray-400">
              Shape the future of VeiledCasts through confidential voting
            </p>
          </div>
          
          {connected && (
            <button
              onClick={() => setShowProposeModal(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
            >
              + Propose Poll
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-800/50 p-1 rounded-lg backdrop-blur-sm">
          <button
            onClick={() => setActiveSection('nomination')}
            className={`flex-1 px-6 py-3 rounded-md font-semibold transition-all ${
              activeSection === 'nomination'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <div className="flex flex-col items-center">
              <span>Nomination</span>
              <span className="text-xs mt-1 opacity-75">Select your top 5</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveSection('voting')}
            className={`flex-1 px-6 py-3 rounded-md font-semibold transition-all ${
              activeSection === 'voting'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <div className="flex flex-col items-center">
              <span>Voting</span>
              <span className="text-xs mt-1 opacity-75">Cast your vote</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveSection('completed')}
            className={`flex-1 px-6 py-3 rounded-md font-semibold transition-all ${
              activeSection === 'completed'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <div className="flex flex-col items-center">
              <span>Completed</span>
              <span className="text-xs mt-1 opacity-75">View results</span>
            </div>
          </button>
        </div>

        {/* How It Works */}
        <div className="mb-8 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-3">📖 How it Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
            <div>
              <span className="text-purple-400 font-semibold">1. Nomination:</span> Propose polls or select up to 5 proposals per week. Top 5 most selected advance to voting.
            </div>
            <div>
              <span className="text-blue-400 font-semibold">2. Voting:</span> Cast your encrypted vote on active polls. All votes remain confidential until reveal.
            </div>
            <div>
              <span className="text-green-400 font-semibold">3. Results:</span> View decrypted vote counts and percentages for completed polls.
            </div>
          </div>
        </div>

        {/* Section Content */}
        <div className="mt-8">
          {activeSection === 'nomination' && <NominationSection key={refreshKey} />}
          {activeSection === 'voting' && <VotingSection />}
          {activeSection === 'completed' && <CompletedSection />}
        </div>
      </div>

      {/* Propose Poll Modal */}
      {showProposeModal && (
        <ProposePollModal 
          onClose={() => setShowProposeModal(false)} 
          onSuccess={handlePollCreated}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-purple-500/20 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          <p className="mb-2">
            Built with{" "}
            <span className="text-purple-400 font-semibold">Arcium</span> •
            Powered by{" "}
            <span className="text-pink-400 font-semibold">Solana</span>
          </p>
          <p className="text-xs text-gray-500 mb-2">
            Your votes are encrypted end-to-end and processed via secure
            multi-party computation
          </p>
          <p className="text-xs text-gray-500">
            Created by{" "}
            <a 
              href="https://x.com/EtherPhantasm" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
            >
              EtherPhantasm
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
