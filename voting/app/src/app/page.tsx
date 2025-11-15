"use client";

import React, { useState } from "react";
import Link from "next/link";
import { WalletButton } from "@/components/WalletButton";
import { CreatePollForm } from "@/components/CreatePollForm";
import { PollList } from "@/components/PollList";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"create" | "polls">("polls");

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
                  className="text-lg font-bold text-gray-300 hover:text-purple-300 transition-colors"
                >
                  DAO Governance
                </Link>
                <Link 
                  href="/"
                  className="text-lg font-bold text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Opinions
                </Link>
              </nav>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Private • Secure • Verifiable
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Create and participate in confidential polls where votes remain
            encrypted until results are revealed. Powered by secure multi-party
            computation on Solana.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 bg-gradient-to-br from-purple-900/30 to-transparent rounded-2xl border border-purple-500/20">
            <h3 className="text-lg font-bold text-white mb-2">
              End-to-End Encryption
            </h3>
            <p className="text-sm text-gray-400">
              Votes are encrypted before submission
            </p>
          </div>

          <div className="p-6 bg-gradient-to-br from-pink-900/30 to-transparent rounded-2xl border border-pink-500/20">
            <h3 className="text-lg font-bold text-white mb-2">
              MPC Computation
            </h3>
            <p className="text-sm text-gray-400">
              Secure multi-party computation ensures vote privacy
            </p>
          </div>

          <div className="p-6 bg-gradient-to-br from-purple-900/30 to-transparent rounded-2xl border border-purple-500/20">
            <h3 className="text-lg font-bold text-white mb-2">
              Authority Control
            </h3>
            <p className="text-sm text-gray-400">
              Only poll creators can reveal final results
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex gap-2 bg-black/40 p-2 rounded-2xl border border-purple-500/20">
            <button
              onClick={() => setActiveTab("polls")}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === "polls"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              View Polls
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === "create"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Create Poll
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto">
          {activeTab === "create" ? (
            <div className="max-w-2xl mx-auto">
              <CreatePollForm
                onPollCreated={() => {
                  setActiveTab("polls");
                }}
              />
            </div>
          ) : (
            <PollList />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          <p className="mb-2">
            Built with{" "}
            <span className="text-purple-400 font-semibold">Arcium {" "}</span>
            On{" "}
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
