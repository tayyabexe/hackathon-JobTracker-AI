import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Application, ActionTask } from '../types';

export function useDashboardData() {
  const [user, setUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [actionQueue, setActionQueue] = useState<ActionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { navigate('/login'); return; }
      setUser(u);
    });
    return () => unsub();
  }, [navigate]);

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

  useEffect(() => {
    if (applications.length === 0) {
      setActionQueue([]);
      return;
    }
    const appIds = applications.map(app => app.id);
    const q = query(collection(db, "action_queue"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ActionTask))
        .filter(task => appIds.includes(task.applicationId) && task.status !== "completed"); 

      setActionQueue(tasksData);
    });
    
    return () => unsubscribe();
  }, [applications]);

  return { user, applications, actionQueue, loading };
}
