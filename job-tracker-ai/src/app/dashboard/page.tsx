'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Application {
  id: string;
  company: string;
  role: string;
  status: string;
  offerProbability: number;
  createdAt?: any;
  analysis?: {
    summary: string;
    sentiment: number;
    nextSteps: string[];
  };
  strategy?: {
    actionPlan: string;
    emailDraft?: string;
  };
  reasoning?: string;
}

interface ActionTask {
  id: string;
  applicationId: string;
  actionType: string;
  deadline?: string;
  userId: string;
  status?: string;
  createdAt?: any;
  draftContent?: string;
}

/* ─────────────────────────────────────────────
   Utility helpers
───────────────────────────────────────────── */
function getStatusClass(status: string) {
  const s = status?.toLowerCase();
  if (s === 'applied')              return 'status-applied';
  if (s === 'interview' || s === 'interview_invite') return 'status-interview';
  if (s === 'offer')                return 'status-offer';
  if (s === 'closed' || s === 'rejection') return 'status-closed';
  return 'status-other';
}

function getProbabilityColor(pct: number) {
  if (pct >= 70) return '#34A853';
  if (pct >= 40) return '#FBBC05';
  return '#EA4335';
}

function formatDate(ts: any) {
  if (!ts) return '—';
  
  // Handle Firestore Timestamp
  if (ts?.toDate && typeof ts.toDate === 'function') {
    return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  // Handle strings (like "ASAP", "Next Week", or ISO strings)
  if (typeof ts === 'string') {
    const d = new Date(ts);
    // If it's a valid date string, format it, otherwise return the string directly
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return ts;
  }
  
  // Fallback for native Date objects or numbers
  try {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (e) {
    return String(ts);
  }
}

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */
function NavIcon({ d }: { d: string }) {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}

function StatCard({
  label, value, sub, color, delay,
}: { label: string; value: string | number; sub?: string; color: string; delay: string }) {
  return (
    <div
      className={`animate-fade-in-up ${delay} glass-card rounded-2xl p-5 group cursor-default hover:border-opacity-60 transition-all duration-300`}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 30px ${color}20`)}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
    >
      <div className="text-xs uppercase tracking-widest font-mono-custom mb-3" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-3xl font-bold font-display transition-transform duration-300 group-hover:scale-105 origin-left" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

function AppCard({ app, index, onOpenStrategy }: { app: Application; index: number; onOpenStrategy: (a: Application) => void }) {
  const prob = Math.min(100, Math.max(0, app.offerProbability ?? 0));
  const probColor = getProbabilityColor(prob);
  const delay = `delay-${Math.min(index * 100, 500)}`;

  return (
    <div
      className={`animate-fade-in-up ${delay} glass-card rounded-2xl p-5 sm:p-6 group transition-all duration-300 hover:border-opacity-50`}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 40px rgba(66,133,244,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div
          className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-base font-display select-none"
          style={{ background: `linear-gradient(135deg, #4285F4, #7C5CFC)` }}
        >
          {app.company?.[0]?.toUpperCase() ?? '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-base font-display truncate" style={{ color: 'var(--text-primary)' }}>
              {app.company}
            </h3>
            <span className={`status-badge ${getStatusClass(app.status)}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {app.status}
            </span>
          </div>
          <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{app.role}</p>
          <p className="text-xs mt-1 font-mono-custom" style={{ color: 'var(--text-muted)' }}>
            {formatDate(app.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-5 flex-shrink-0">
          <div className="text-right min-w-[80px]">
            <div className="text-xs uppercase tracking-widest font-mono-custom mb-1" style={{ color: 'var(--text-muted)' }}>
              Probability
            </div>
            <div className="text-2xl font-black font-display" style={{ color: probColor }}>
              {prob}<span className="text-sm font-medium">%</span>
            </div>
            <div className="progress-bar mt-1.5 w-full">
              <div
                className="progress-bar-fill"
                style={{ width: `${prob}%`, background: probColor }}
              />
            </div>
          </div>

          <button
            onClick={() => onOpenStrategy(app)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border"
            style={{
              background: 'rgba(66,133,244,0.08)',
              borderColor: 'rgba(66,133,244,0.25)',
              color: '#4285F4',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#4285F4';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = '#4285F4';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(66,133,244,0.08)';
              e.currentTarget.style.color = '#4285F4';
              e.currentTarget.style.borderColor = 'rgba(66,133,244,0.25)';
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Strategy
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Dashboard Component
───────────────────────────────────────────── */
export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [actionQueue, setActionQueue] = useState<ActionTask[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const handleMarkComplete = async (taskId: string) => {
    try {
      const taskRef = doc(db, "action_queue", taskId);
      // Update the database document
      await updateDoc(taskRef, {
        status: "completed"
      });
      // The onSnapshot listener will automatically remove it from the UI,
      // so we just need to close the modal.
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error marking task complete:", error);
      alert("Failed to update database. Check console.");
    }
  };

  /* Auth listener */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push('/'); return; }
      setUser(u);
    });
    return () => unsub();
  }, [router]);

  /* Firestore real-time listener: Applications */
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'applications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Application)));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  /* Firestore real-time listener: Action Queue */
  useEffect(() => {
    // If the user has no applications yet, they can't have tasks.
    if (applications.length === 0) {
      setActionQueue([]);
      return;
    }

    // Extract an array of just the Application IDs belonging to this user
    const appIds = applications.map(app => app.id);

    // Listen to the action_queue collection
    const q = query(collection(db, "action_queue"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ActionTask))
        // SECURITY & FILTERING: Only keep tasks where the applicationId matches one of ours AND are not completed
        .filter(task => appIds.includes(task.applicationId) && task.status !== "completed"); 

      setActionQueue(tasksData);
    });

    // Re-run this listener anytime the applications array changes
  }, [applications]);

  if (!user) return null;

  const firstName = user.displayName?.split(' ')[0] ?? 'Commander';
  const activeCount = applications.filter(a => !['closed', 'rejection'].includes(a.status?.toLowerCase())).length;
  const interviewCount = applications.filter(a =>
    ['interview', 'interview_invite'].includes(a.status?.toLowerCase())
  ).length;
  const avgProb = applications.length
    ? Math.round(applications.reduce((s, a) => s + (a.offerProbability ?? 0), 0) / applications.length)
    : 0;

  const navItems = [
    { icon: 'M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z M3 7l9 6 9-6', label: 'Pipeline', active: true },
    { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Analytics', active: false },
    { icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Action Queue', active: false },
    { icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', label: 'AI Insights', active: false },
    { icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', label: 'Settings', active: false },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* ── SIDEBAR ─────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col w-60 transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4285F4, #7C5CFC)' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01" />
            </svg>
          </div>
          <span className="font-bold text-sm font-display">JobTracker AI</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <div key={item.label} className={`nav-item ${item.active ? 'active' : ''}`}>
              <NavIcon d={item.icon} />
              <span>{item.label}</span>
              {item.label === 'Action Queue' && actionQueue.length > 0 && (
                <span className="ml-auto text-xs font-mono-custom px-1.5 py-0.5 rounded-md"
                  style={{ background: 'rgba(251,188,5,0.15)', color: '#FBBC05' }}>{actionQueue.length}</span>
              )}
            </div>
          ))}
        </nav>

        <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors hover:bg-opacity-50"
            style={{ background: 'var(--bg-elevated)' }}>
            <img
              src={user.photoURL ?? `https://api.dicebear.com/7.x/initials/svg?seed=${firstName}`}
              alt={firstName}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{firstName}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
            </div>
            <button onClick={() => signOut(auth)} className="p-1 text-gray-500 hover:text-red-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex-shrink-0 h-16 flex items-center justify-between px-4 sm:px-6"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-gray-400" onClick={() => setSidebarOpen(true)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-bold font-display uppercase tracking-tight">War Room</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-500 text-[10px] font-mono tracking-tighter uppercase animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Live Feed
            </div>
            <button className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg hover:scale-105 transition-transform active:scale-95">
              Add App
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 animate-fade-in-up">
              <h2 className="text-3xl sm:text-4xl font-black font-display mb-2 uppercase italic tracking-tighter">
                Hello, <span className="text-transparent bg-clip-text animate-gradient-x" style={{ backgroundImage: 'linear-gradient(90deg, #4285F4, #34A853, #7C5CFC)' }}>{firstName}</span>
              </h2>
              <p className="text-gray-400 font-mono text-sm">STRATEGIC COMMAND DASHBOARD V2.5</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="Active Apps" value={activeCount} color="#4285F4" delay="delay-100" />
              <StatCard label="Interviews" value={interviewCount} color="#FBBC05" delay="delay-200" sub="Pending Action" />
              <StatCard label="Avg Probability" value={`${avgProb}%`} color="#34A853" delay="delay-300" />
              <StatCard label="Agent Tasks" value={actionQueue.length} color="#7C5CFC" delay="delay-400" sub="In Queue" />
            </div>

            <div className="grid grid-cols-12 gap-8">
              {/* Pipeline List */}
              <div className="col-span-12 lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest">Active Intelligence</h3>
                  <span className="text-gray-600 text-[10px] font-mono">COUNT: {applications.length}</span>
                </div>
                
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 skeleton rounded-2xl" />)}
                  </div>
                ) : applications.length > 0 ? (
                  <div className="space-y-3">
                    {applications.map((app, i) => (
                      <AppCard 
                        key={app.id} 
                        app={app} 
                        index={i} 
                        onOpenStrategy={(a) => { setSelectedApp(a); setIsModalOpen(true); }} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-800 rounded-3xl p-16 text-center">
                    <p className="text-gray-600 font-mono animate-pulse">AWAITING_INGESTION...</p>
                  </div>
                )}
              </div>

              {/* Action Queue */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest">Strategist Agent Tasks</h3>
                  <span className="text-gray-600 text-[10px] font-mono">TASKS: {actionQueue.length}</span>
                </div>

                <div className="space-y-3">
                  {actionQueue.length > 0 ? (
                    actionQueue.map(task => {
                      // THE CLIENT-SIDE JOIN: Find the parent application to get the company name
                      const parentApp = applications.find(app => app.id === task.applicationId);
                      const companyName = parentApp ? parentApp.company : "Unknown Company";

                      return (
                        <div key={task.id} className="animate-fade-in-up glass-card rounded-2xl p-4 border-l-4 border-amber-500 flex flex-col justify-between h-full">
                          <div>
                            <div className="text-[10px] text-amber-500 font-mono uppercase font-bold mb-1">
                              {task.actionType}
                            </div>
                            <div className="text-sm font-bold font-display text-white">
                              {companyName}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-2 font-mono">
                              STATUS: {task.status || "PENDING"} | DUE: {task.deadline ? formatDate(task.deadline) : "ASAP"}
                            </div>
                          </div>
                          
                          <button 
                            className="mt-4 w-full border border-gray-600 rounded-xl py-2 text-xs font-bold text-gray-300 hover:bg-white hover:text-black transition-colors"
                            onClick={() => {
                              if (parentApp) {
                                setSelectedApp(parentApp);
                                setIsModalOpen(true);
                              }
                            }}
                          >
                            REVIEW STRATEGY
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="border-2 border-dashed border-gray-800 rounded-2xl p-8 text-center">
                      <p className="text-xs text-gray-700 font-mono">AGENT_IDLE</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL OVERLAY */}
      {isModalOpen && selectedApp && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#1C1E27] border-2 border-[#4285F4] shadow-[8px_8px_0px_0px_#4285F4] max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            
            {/* Modal Header */}
            <div className="border-b-2 border-[#2A2D3A] p-6 flex justify-between items-start bg-[#13141A]">
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">{selectedApp.company}</h2>
                <p className="text-[#4285F4] font-mono text-sm mt-1 uppercase">{selectedApp.role} • STRATEGY BRIEF</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-white font-mono text-2xl font-bold transition-colors"
              >
                [X]
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 grid gap-6">
              
              {/* Agent Reasoning Section */}
              <div className="border-2 border-[#2A2D3A] p-5 bg-[#13141A]">
                <div className="text-xs uppercase font-mono text-[#34A853] mb-3 flex items-center gap-2 font-bold tracking-widest">
                  <span className="w-2 h-2 bg-[#34A853] rounded-full animate-pulse shadow-[0_0_8px_#34A853]"></span>
                  Analyst Agent Reasoning
                </div>
                <p className="text-gray-300 font-mono text-sm whitespace-pre-wrap leading-relaxed">
                  {selectedApp.analysis?.summary || selectedApp.reasoning || "Analysis data pending extraction..."}
                </p>
              </div>

              {/* AI Drafted Action Section */}
              <div className="border-2 border-[#2A2D3A] p-5 bg-[#13141A]">
                 <div className="text-xs uppercase font-mono text-[#FBBC05] mb-3 flex justify-between items-center font-bold tracking-widest">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#FBBC05] rounded-full"></span>
                      Strategist Agent Draft
                    </span>
                    <span className="text-gray-500 border border-gray-700 px-2 py-1 text-[10px]">
                      AUTO-GENERATED
                    </span>
                 </div>
                 
                 <div className="bg-black p-5 text-gray-300 font-mono text-sm whitespace-pre-wrap border border-gray-800 relative group">
                    {/* Dynamically look up the draft content for this specific application */}
                    {actionQueue.find(t => t.applicationId === selectedApp.id)?.draftContent || "No drafted response available for this event."}
                    
                    {/* One-Click Copy Button */}
                    <button 
                      onClick={() => {
                        const draft = actionQueue.find(t => t.applicationId === selectedApp.id)?.draftContent;
                        if (draft) {
                          navigator.clipboard.writeText(draft);
                          alert("Draft copied to clipboard!");
                        }
                      }}
                      className="absolute top-4 right-4 bg-white text-black border-2 border-black px-4 py-2 text-xs font-bold uppercase hover:bg-[#4285F4] hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    >
                      Copy
                    </button>
                 </div>
                 
                 <div className="mt-6 flex justify-end gap-4 border-t-2 border-[#2A2D3A] pt-4">
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-2 border-2 border-gray-600 text-gray-400 hover:text-white font-bold uppercase text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        const activeTask = actionQueue.find(t => t.applicationId === selectedApp.id);
                        if (activeTask) handleMarkComplete(activeTask.id);
                      }}
                      className="bg-[#34A853] text-black border-2 border-black px-6 py-2 font-black uppercase text-sm hover:bg-white transition-colors"
                    >
                      Mark as Executed
                    </button>
                 </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
