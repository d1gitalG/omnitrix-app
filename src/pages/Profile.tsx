import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State for profile fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [techLevel, setTechLevel] = useState(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // Listen for profile data changes
  useEffect(() => {
    if (!user) return;

    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setName(data.name || '');
        setPhone(data.phone || '');
        setTechLevel(data.techLevel || 1);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching profile:", error);
      setLoading(false);
    });

    return () => unsubProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      await setDoc(doc(db, 'users', user.uid), {
        name,
        phone,
        techLevel,
        email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setMessage({ type: 'success', text: 'Profile saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
      setMessage({ type: 'error', text: 'Failed to save profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-zinc-500">
        You must be logged in to view this page.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <h1 className="text-xl font-bold text-white px-2">Your Profile</h1>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium animate-in fade-in zoom-in duration-300 ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 ml-1">
              Email
            </label>
            <input
              type="text"
              disabled
              value={user.email || ''}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-500 rounded-xl px-4 py-3 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 ml-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 ml-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 ml-1">
              Tech Level
            </label>
            <select
              value={techLevel}
              onChange={(e) => setTechLevel(parseInt(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none appearance-none"
            >
              <option value={1}>Level 1 - Apprentice</option>
              <option value={2}>Level 2 - Technician</option>
              <option value={3}>Level 3 - Lead</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-95 ${
            saving 
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
              : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
          }`}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      <button
        onClick={handleSignOut}
        className="w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-95 bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20"
      >
        Sign Out
      </button>
    </div>
  );
}
