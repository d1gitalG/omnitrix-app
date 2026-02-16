import { useState, useEffect } from 'react';
import { LogOut, Save, UserCircle } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Technician');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setName(currentUser.displayName || '');
        
        // Fetch extra data from Firestore
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setRole(docSnap.data().role || 'Technician');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
        // Update Auth Profile
        await updateProfile(user, { displayName: name });
        
        // Update Firestore
        await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            displayName: name,
            role: role,
            updatedAt: new Date()
        }, { merge: true }); // Merge ensures we don't overwrite other fields

        alert('Profile Updated!');
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile.');
    } finally {
        setSaving(false);
    }
  };

  if (!user) return <div className="p-8 text-center text-zinc-500">Please Log In via Jobs tab.</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-xl font-bold text-white mb-6">My Profile</h1>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
         <div className="mx-auto bg-zinc-800 h-24 w-24 rounded-full flex items-center justify-center mb-4 border-2 border-zinc-700">
             {user.photoURL ? (
                 <img src={user.photoURL} alt="Avatar" className="h-full w-full rounded-full object-cover" />
             ) : (
                 <UserCircle className="h-12 w-12 text-zinc-500" />
             )}
         </div>
         <p className="text-zinc-400 text-sm font-mono">{user.email}</p>
         <p className="text-xs text-zinc-600 mt-1 uppercase tracking-widest">{user.uid.slice(0, 8)}...</p>
      </div>

      <div className="space-y-4">
          <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider ml-1">Display Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none"
                placeholder="e.g. Gianni"
              />
          </div>

          <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider ml-1">Role</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none appearance-none"
              >
                  <option value="Technician">Technician (L1)</option>
                  <option value="Lead">Lead Technician (L2)</option>
                  <option value="Admin">Admin</option>
              </select>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-4"
          >
            {saving ? 'Saving...' : <><Save className="h-4 w-4" /> Save Changes</>}
          </button>

          <button 
            onClick={() => auth.signOut()}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 border border-red-500/20"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
      </div>
    </div>
  );
}
