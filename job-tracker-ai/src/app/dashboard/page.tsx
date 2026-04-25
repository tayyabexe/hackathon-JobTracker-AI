'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/');
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (!user) return null;

  // Safely extract the first name, fallback to 'Commander' if Google profile is missing the name
  const firstName = user.displayName ? user.displayName.split(' ')[0] : 'Commander';

  return (
    <div className="min-h-[100dvh] bg-[#0B0C0E] text-[#E8EAF2] p-4 sm:p-8 font-sans">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 pb-6 border-b border-[#2A2D3A] gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">War Room</h1>
          <p className="text-[#6B7394] text-sm mt-1">Command your job hunt, <span className="text-[#E8EAF2] font-medium">{firstName}</span>.</p>
        </div>
        <button 
          onClick={() => signOut(auth)}
          className="self-start sm:self-auto text-xs sm:text-sm bg-[#1C1E27] border border-[#2A2D3A] px-4 py-2 sm:py-2.5 rounded-lg text-[#6B7394] hover:text-[#E8EAF2] hover:bg-[#2A2D3A] hover:border-[#4F6EF7]/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/50"
        >
          Sign Out
        </button>
      </header>

      {/* Top Bar Metrics - Fully responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#13141A] border border-[#2A2D3A] rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#4F6EF7]/50 hover:shadow-[0_10px_30px_rgba(79,110,247,0.1)] group cursor-default">
          <div className="text-[#6B7394] text-xs uppercase tracking-wider font-mono mb-2">Active Apps</div>
          <div className="text-3xl sm:text-4xl font-bold text-[#4F6EF7] group-hover:scale-105 transition-transform origin-left">12</div>
        </div>
        <div className="bg-[#13141A] border border-[#2A2D3A] rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#2ECFA8]/50 hover:shadow-[0_10px_30px_rgba(46,207,168,0.1)] group cursor-default">
          <div className="text-[#6B7394] text-xs uppercase tracking-wider font-mono mb-2">Momentum</div>
          <div className="text-3xl sm:text-4xl font-bold text-[#2ECFA8] group-hover:scale-105 transition-transform origin-left">↑4</div>
        </div>
        <div className="bg-[#13141A] border border-[#2A2D3A] rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#F7C14F]/50 hover:shadow-[0_10px_30px_rgba(247,193,79,0.1)] group cursor-default">
          <div className="text-[#6B7394] text-xs uppercase tracking-wider font-mono mb-2">Interviews</div>
          <div className="text-3xl sm:text-4xl font-bold text-[#F7C14F] group-hover:scale-105 transition-transform origin-left">2</div>
        </div>
      </div>

      {/* Applications List Area */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg sm:text-xl font-bold">Active Pipeline</h2>
          <button className="text-xs sm:text-sm bg-[#4F6EF7] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#3D56D1] hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-[#4F6EF7] focus:ring-offset-2 focus:ring-offset-[#0B0C0E]">
            Add Application
          </button>
        </div>
        <div className="bg-[#13141A]/50 backdrop-blur-sm border border-[#2A2D3A] border-dashed rounded-xl p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[200px] transition-colors hover:border-[#4F6EF7]/30 hover:bg-[#13141A]">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#1C1E27] rounded-full flex items-center justify-center mb-4 border border-[#2A2D3A] shadow-inner">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-[#6B7394]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 00-2 2H6a2 2 0 00-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-[#6B7394] text-sm sm:text-base mb-2">No applications tracked yet.</p>
          <p className="text-xs text-[#4F6EF7] font-mono animate-pulse">System awaiting email ingestion...</p>
        </div>
      </div>
    </div>
  );
}
