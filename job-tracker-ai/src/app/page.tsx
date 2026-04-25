'use client';

import { useEffect, useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        router.push('/dashboard');
      } else {
        setIsAuthenticating(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      
      // CRITICAL: Request permission to read Gmail
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      
      // CRITICAL: Force consent screen to ensure we get offline access tokens
      provider.setCustomParameters({
        prompt: 'consent',
        access_type: 'offline'
      });

      const result = await signInWithPopup(auth, provider);
      
      // Extract the OAuth tokens
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      
      if (result.user && accessToken) {
        // 1. Save the user and their access token to Firestore
        const userRef = doc(db, 'users', result.user.uid);
        await setDoc(userRef, {
          email: result.user.email,
          displayName: result.user.displayName,
          gmailAccessToken: accessToken,
          lastLoginAt: serverTimestamp()
        }, { merge: true });

        // 2. Call our secure API route to activate the Gmail Watch API
        await fetch('/api/gmail/watch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken })
        });
      }
    } catch (error: any) {
       if (error?.code !== 'auth/cancelled-popup-request' && error?.code !== 'auth/popup-closed-by-user') {
        console.error("Authentication failed:", error);
       }
    } finally {
      setIsSigningIn(false);
    }
  };

  if (isAuthenticating) {
    return (
      <main className="min-h-[100dvh] bg-[#0B0C0E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-t-2 border-[#4F6EF7] border-solid rounded-full animate-spin"></div>
          <p className="text-[#6B7394] font-mono tracking-widest uppercase text-xs animate-pulse">Authenticating...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#0B0C0E] text-[#E8EAF2] flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Ambient glowing background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-[#4F6EF7]/10 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-[#13141A]/90 backdrop-blur-2xl border border-[#2A2D3A] rounded-3xl p-8 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center text-center relative z-10 transition-all duration-500 hover:border-[#4F6EF7]/30 hover:shadow-[0_0_50px_rgba(79,110,247,0.1)] group">
        
        {/* App Icon */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#4F6EF7] to-[#2ECFA8] rounded-2xl mb-6 sm:mb-8 flex items-center justify-center shadow-lg transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
           <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
           </svg>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3 font-sans">
          Job<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4F6EF7] to-[#2ECFA8]">Tracker</span> AI
        </h1>
        <p className="text-[#8B93A4] mb-8 sm:mb-10 text-sm sm:text-base leading-relaxed">
          Intelligent application tracking. Command your job hunt with AI-driven insights.
        </p>

        <button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className={`w-full relative bg-[#E8EAF2] text-[#0B0C0E] font-bold py-3.5 sm:py-4 px-4 rounded-xl sm:rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-[#4F6EF7] focus:ring-offset-2 focus:ring-offset-[#13141A] ${
            isSigningIn 
              ? 'opacity-80 cursor-not-allowed scale-95' 
              : 'hover:bg-white hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] group-hover:bg-white'
          }`}
        >
          {isSigningIn ? (
             <div className="w-5 h-5 border-t-2 border-[#0B0C0E] border-solid rounded-full animate-spin"></div>
          ) : (
             <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
               <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
               <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
               <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
               <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
             </svg>
          )}
          {isSigningIn ? 'Connecting...' : 'Sign In with Google'}
        </button>
      </div>
    </main>
  );
}
