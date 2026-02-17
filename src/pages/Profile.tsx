import { auth } from '../lib/firebase';

export default function Profile() {
  const user = auth.currentUser;

  if (!user) {
    return (
      <div className="p-8 text-center text-zinc-500">
        You must be logged in to view this page.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-xl font-bold text-white">Your Profile</h1>
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
        <p className="text-sm text-zinc-400">You are signed in as:</p>
        <p className="text-lg font-mono text-white">{user.email}</p>
      </div>
      <button
        onClick={() => auth.signOut()}
        className="w-full py-3 rounded-xl font-bold text-lg transition-all active:scale-95 bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20"
      >
        Sign Out
      </button>
    </div>
  );
}
