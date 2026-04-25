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
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      provider.setCustomParameters({ prompt: 'consent', access_type: 'offline' });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      if (result.user && accessToken) {
        const userRef = doc(db, 'users', result.user.uid);
        await setDoc(userRef, {
          email: result.user.email,
          displayName: result.user.displayName,
          gmailAccessToken: accessToken,
          lastLoginAt: serverTimestamp(),
        }, { merge: true });

        await fetch('/api/gmail/watch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
        });
      }
    } catch (error: any) {
      if (error?.code !== 'auth/cancelled-popup-request' && error?.code !== 'auth/popup-closed-by-user') {
        console.error('Authentication failed:', error);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  if (isAuthenticating) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-t-2 border-[var(--accent-primary)] border-solid rounded-full animate-spin" />
          <p className="font-mono tracking-widest uppercase text-xs animate-pulse text-[var(--text-muted)]">
            Authenticating...
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="bg-dot-pattern"></div>
      <div className="glass-panel" style={{ padding: '3rem', width: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div className="flex justify-center mb-6">
             <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01" />
                </svg>
              </div>
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>JobTracker AI</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Access your Commander Dashboard</p>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="btn btn-primary" 
          style={{ marginTop: '1rem', width: '100%', padding: '1rem' }}
        >
          {isSigningIn ? 'Connecting...' : 'Initialize Sequence (Google)'}
        </button>
      </div>
    </div>
  );
}
