'use client';

import { useEffect, useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useRouter } from 'next/navigation';

/* ─────────────────────────────────────────────
   Feature Card Data
───────────────────────────────────────────── */
const features = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Real-time Analysis',
    desc: 'Continuous monitoring of your application pipeline with predictive success modeling and bottleneck identification.',
    accent: '#4285F4',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Gmail Ingestion',
    desc: 'Zero manual data entry. We securely sync with your inbox to automatically track application statuses, interviews, and rejections.',
    accent: '#34A853',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Automated Strategy',
    desc: 'AI-generated action plans based on market trends, telling you exactly who to network with and what skills to highlight next.',
    accent: '#7C5CFC',
  },
];

/* ─────────────────────────────────────────────
   Home Page Component
───────────────────────────────────────────── */
export default function Home() {
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [scrollY, setScrollY] = useState(0);

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

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      <main className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#070809' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-t-2 border-[#4285F4] border-solid rounded-full animate-spin" />
          <p className="font-mono-custom tracking-widest uppercase text-xs animate-pulse" style={{ color: '#555978' }}>
            Authenticating...
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#070809', color: '#F0F2FF' }}>

      {/* ═══ NAVIGATION ═══ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrollY > 50 ? 'rgba(7, 8, 9, 0.85)' : 'transparent',
          backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
          borderBottom: scrollY > 50 ? '1px solid rgba(30, 32, 48, 0.6)' : '1px solid transparent',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4285F4, #7C5CFC)' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01" />
              </svg>
            </div>
            <span className="font-bold text-sm font-display">JobTracker AI</span>
          </div>

          {/* Center links (desktop) */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Pricing', 'AI Insights', 'Enterprise'].map((item) => (
              <a key={item} href="#"
                className="text-sm font-medium transition-colors duration-200"
                style={{
                  color: item === 'AI Insights' ? '#4285F4' : '#9096B8',
                  textDecoration: item === 'AI Insights' ? 'underline' : 'none',
                  textDecorationColor: item === 'AI Insights' ? '#4285F4' : 'transparent',
                  textUnderlineOffset: '6px',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#F0F2FF'}
                onMouseLeave={e => e.currentTarget.style.color = item === 'AI Insights' ? '#4285F4' : '#9096B8'}
              >
                {item}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="text-sm font-medium transition-colors duration-200 hidden sm:inline-block"
              style={{ color: '#9096B8' }}
              onMouseEnter={e => e.currentTarget.style.color = '#F0F2FF'}
              onMouseLeave={e => e.currentTarget.style.color = '#9096B8'}
            >
              Login
            </button>
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300 hover:opacity-90 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #4285F4, #34A853)',
                color: 'white',
                boxShadow: '0 0 20px rgba(66, 133, 244, 0.3)',
              }}
            >
              {isSigningIn ? 'Connecting...' : 'Get Started'}
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background image */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(/hero-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            transform: `scale(${1 + scrollY * 0.0003})`,
            transition: 'transform 0.1s linear',
          }}
        />
        {/* Overlays for depth */}
        <div className="absolute inset-0 z-[1]" style={{ background: 'radial-gradient(ellipse at center, transparent 20%, #070809 75%)' }} />
        <div className="absolute inset-0 z-[1]" style={{ background: 'linear-gradient(to bottom, transparent 60%, #070809 100%)' }} />
        <div className="absolute inset-0 z-[1]" style={{ background: 'rgba(7, 8, 9, 0.35)' }} />

        {/* Content */}
        <div className="relative z-10 text-center px-4 sm:px-6 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 animate-fade-in"
            style={{
              background: 'rgba(66, 133, 244, 0.08)',
              border: '1px solid rgba(66, 133, 244, 0.2)',
            }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#34A853' }} />
            <span className="text-xs font-mono-custom tracking-widest uppercase" style={{ color: '#9096B8' }}>
              Introducing Strategist Agent v2.0
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold font-display leading-[1.1] mb-6 animate-fade-in-up">
            <span style={{ color: '#F0F2FF' }}>Stop Applying.</span>
            <br />
            <span style={{ color: '#F0F2FF' }}>Start Engineering Your</span>
            <br />
            <span className="text-transparent bg-clip-text animate-gradient-x"
              style={{ backgroundImage: 'linear-gradient(90deg, #4285F4, #34A853, #7C5CFC, #4285F4)' }}>
              Career.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-200" style={{ color: '#9096B8' }}>
            JobTracker AI ingests your applications, analyzes market signals, and deploys autonomous agents to optimize your job search strategy in real-time.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="group relative px-8 py-3.5 rounded-full text-sm font-semibold text-white transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #4285F4, #34A853)',
                boxShadow: '0 0 30px rgba(66, 133, 244, 0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                {isSigningIn ? (
                  <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                {isSigningIn ? 'Connecting...' : 'Deploy Your Agent'}
              </span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>

            <button
              className="flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#F0F2FF',
                backdropFilter: 'blur(10px)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Demo
            </button>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 z-10"
          style={{ background: 'linear-gradient(to top, #070809, transparent)' }} />
      </section>

      {/* ═══ FEATURES SECTION ═══ */}
      <section className="relative py-24 sm:py-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4" style={{ color: '#F0F2FF' }}>
              The Intelligence Advantage
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: '#9096B8' }}>
              A complete suite of tools designed to outsmart the modern hiring process.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group rounded-2xl p-6 sm:p-8 transition-all duration-400 cursor-default"
                style={{
                  background: 'rgba(14, 15, 18, 0.7)',
                  border: '1px solid rgba(30, 32, 48, 0.8)',
                  backdropFilter: 'blur(12px)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${f.accent}40`;
                  e.currentTarget.style.boxShadow = `0 20px 60px ${f.accent}10`;
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(30, 32, 48, 0.8)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Icon */}
                <div className="flex items-center justify-between mb-6">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${f.accent}15`, color: f.accent }}
                  >
                    {f.icon}
                  </div>
                  {/* Decorative corner icon */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity"
                    style={{ background: `${f.accent}08`, color: f.accent }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>

                <h3 className="text-lg font-semibold font-display mb-3" style={{ color: '#F0F2FF' }}>
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#9096B8' }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF STRIP ═══ */}
      <section className="py-16 px-4 sm:px-6" style={{ borderTop: '1px solid rgba(30,32,48,0.5)', borderBottom: '1px solid rgba(30,32,48,0.5)' }}>
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-8 sm:gap-14">
          {['Firebase', 'Gemini 2.5', 'Google Cloud', 'Gmail API'].map(name => (
            <div key={name} className="flex items-center gap-2 opacity-40 hover:opacity-70 transition-opacity">
              <div className="w-5 h-5 rounded bg-white/10" />
              <span className="text-sm font-medium font-display" style={{ color: '#9096B8' }}>{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 pb-8"
            style={{ borderBottom: '1px solid rgba(30,32,48,0.5)' }}>
            {/* Footer logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #4285F4, #7C5CFC)' }}>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01" />
                </svg>
              </div>
              <span className="font-bold text-sm font-display">JobTracker AI</span>
            </div>

            {/* Footer links */}
            <div className="flex flex-wrap items-center gap-6 sm:gap-8">
              {['Product', 'Community', 'Company', 'Legal'].map(link => (
                <a key={link} href="#" className="text-sm transition-colors duration-200"
                  style={{ color: '#555978' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#9096B8'}
                  onMouseLeave={e => e.currentTarget.style.color = '#555978'}
                >
                  {link}
                </a>
              ))}
            </div>
          </div>

          <p className="text-center text-xs font-mono-custom" style={{ color: '#555978' }}>
            © {new Date().getFullYear()} JobTracker AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
