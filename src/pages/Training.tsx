import { useState, useEffect } from 'react';
import { CheckCircle2, ChevronRight, FileText, Youtube } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const level1Checklist = [
  { id: 'l1-1', title: 'OSHA Safety Basics', desc: 'Complete the initial OSHA 10 safety review.', category: 'Safety' },
  { id: 'l1-2', title: 'Tool Inventory', desc: 'Verify strippers, punch tool, and crimper in kit.', category: 'Hardware' },
  { id: 'l1-3', title: 'Cat6 Termination', desc: 'Master T568B color coding and crimping.', category: 'Skill' },
  { id: 'l1-4', title: 'Site Protocols', desc: 'Review check-in/check-out procedures.', category: 'Admin' },
];

const level2Checklist = [
  { id: 'l2-1', title: 'Rack Dressing', desc: 'Organize patch panels with velcro/D-rings.', category: 'Hardware' },
  { id: 'l2-2', title: 'Fluke Testing', desc: 'Run certification tests on all copper drops.', category: 'Skill' },
  { id: 'l2-3', title: 'Fiber Prep', desc: 'Clean and prep fiber for mechanical termination.', category: 'Skill' },
  { id: 'l2-4', title: 'Labeling Standard', desc: 'Apply ANSI/TIA-606-B labeling to all ports.', category: 'Admin' },
];

const level3Checklist = [
  { id: 'l3-1', title: 'Fusion Splicing', desc: 'Operate fusion splicer for backbone links.', category: 'Skill' },
  { id: 'l3-2', title: 'OTDR Testing', desc: 'Analyze fiber traces and identify fault points.', category: 'Skill' },
  { id: 'l3-3', title: 'Blueprint Reading', desc: 'Interpret floor plans and riser diagrams.', category: 'Admin' },
  { id: 'l3-4', title: 'Team Lead Prep', desc: 'Coordinate materials and workflow for a 3-man crew.', category: 'Leadership' },
];

const level1Videos = [
  { id: 'v1-1', title: 'How to Terminate Cat6 (Pass-Through)', url: 'https://www.youtube.com/watch?v=lnrL_rJdaQc', duration: '5 mins' },
  { id: 'v1-2', title: 'Punch Down Tool Tutorial', url: 'https://www.youtube.com/watch?v=0W8m8C-P2v0', duration: '4 mins' },
];

const level2Videos = [
  { id: 'v2-1', title: 'Professional Rack Cable Management', url: 'https://www.youtube.com/watch?v=N_W97V6m60M', duration: '12 mins' },
  { id: 'v2-2', title: 'Using a Fluke DSX-5000', url: 'https://www.youtube.com/watch?v=0W8m8C-P2v0', duration: '10 mins' },
];

const level3Videos = [
  { id: 'v3-1', title: 'Fiber Splicing Masterclass', url: 'https://www.youtube.com/watch?v=N_W97V6m60M', duration: '15 mins' },
  { id: 'v3-2', title: 'OTDR Trace Analysis', url: 'https://www.youtube.com/watch?v=0W8m8C-P2v0', duration: '20 mins' },
];

export default function Training() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [techLevel, setTechLevel] = useState<number>(1);
  
  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch User Level & Firestore Sync
  useEffect(() => {
    if (!user) return;

    // Fetch Level via listener (works with offline persistence)
    const userRef = doc(db, 'users', user.uid);
    const unsubLevel = onSnapshot(userRef, (userSnap) => {
      if (userSnap.exists() && userSnap.data().techLevel) {
        setTechLevel(userSnap.data().techLevel);
      }
    });

    // Sync Progress
    const docRef = doc(db, 'training_progress', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCompleted(docSnap.data().completed || []);
      }
    });

    return () => { unsubLevel(); unsubscribe(); };
  }, [user]);

  const handleToggle = async (id: string) => {
    let newCompleted;
    if (completed.includes(id)) {
      newCompleted = completed.filter(c => c !== id);
    } else {
      newCompleted = [...completed, id];
    }
    
    setCompleted(newCompleted);

    if (user) {
      try {
        await setDoc(doc(db, 'training_progress', user.uid), {
          completed: newCompleted,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        console.error("Error saving training progress:", error);
      }
    }
  };

  const getActiveChecklist = () => {
    if (techLevel === 2) return level2Checklist;
    if (techLevel === 3) return level3Checklist;
    return level1Checklist;
  };

  const getActiveVideos = () => {
    if (techLevel === 2) return level2Videos;
    if (techLevel === 3) return level3Videos;
    return level1Videos;
  };

  const getLevelBadge = () => {
    if (techLevel === 2) return "Level 2 - Technician";
    if (techLevel === 3) return "Level 3 - Lead";
    return "Level 1 - Apprentice";
  };

  const currentChecklist = getActiveChecklist();
  const currentVideos = getActiveVideos();
  
  // Calculate progress only against items in the current tier
  const completedInTier = completed.filter(id => currentChecklist.some(item => item.id === id));
  const progress = currentChecklist.length > 0 
    ? Math.round((completedInTier.length / currentChecklist.length) * 100) 
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between">
         <h1 className="text-xl font-bold text-white">Training Center</h1>
         <div className="bg-zinc-800 text-xs text-zinc-400 px-3 py-1 rounded-full border border-zinc-700">
            {getLevelBadge()}
         </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
         <div className="flex justify-between text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">
            <span>Tier Progress</span>
            <span>{progress}%</span>
         </div>
         <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
         </div>
      </div>

      {/* Checklist */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
           <CheckCircle2 className="h-4 w-4" /> Skill Checklist
        </h2>
        <div className="space-y-2">
           {currentChecklist.map((item) => (
             <div 
               key={item.id}
               onClick={() => handleToggle(item.id)}
               className={cn(
                 "group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer active:scale-[0.98]",
                 completed.includes(item.id)
                   ? "bg-green-950/20 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                   : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
               )}
             >
                <div className="flex items-center gap-3">
                   <div className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      completed.includes(item.id) 
                        ? "bg-green-500 border-green-500" 
                        : "border-zinc-600 group-hover:border-zinc-500"
                   )}>
                      {completed.includes(item.id) && <CheckCircle2 className="h-3 w-3 text-white" />}
                   </div>
                   <div>
                      <h3 className={cn(
                        "font-medium text-sm transition-colors",
                        completed.includes(item.id) ? "text-green-200 line-through decoration-green-500/50" : "text-zinc-200"
                      )}>
                        {item.title}
                      </h3>
                      <p className="text-xs text-zinc-500">{item.desc}</p>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </section>

      {/* Video Resources */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
           <Youtube className="h-4 w-4" /> Recommended Videos
        </h2>
        <div className="grid gap-3">
           {currentVideos.map((video) => (
             <a 
               key={video.id}
               href={video.url} 
               target="_blank"
               rel="noreferrer" 
               className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors group"
             >
                <div className="bg-red-500/10 p-3 rounded-lg group-hover:bg-red-500/20 transition-colors">
                   <Youtube className="h-6 w-6 text-red-500" />
                </div>
                <div>
                   <h3 className="font-medium text-zinc-200 text-sm">{video.title}</h3>
                   <p className="text-xs text-zinc-500 mt-1">Video • {video.duration}</p>
                </div>
                <ChevronRight className="ml-auto h-5 w-5 text-zinc-600 group-hover:text-zinc-400" />
             </a>
           ))}
        </div>
      </section>

      {/* PDF Manuals */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
           <FileText className="h-4 w-4" /> Manuals & Documentation
        </h2>
        <div className="grid grid-cols-2 gap-3">
           <a 
             href="https://example.com/tech-manual.pdf"
             target="_blank"
             rel="noreferrer"
             className="flex flex-col items-center justify-center p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors active:scale-95 text-center"
           >
              <FileText className="h-6 w-6 text-blue-400 mb-2" />
              <span className="text-xs font-medium text-zinc-300">Tech Manual v1</span>
           </a>
           <a 
             href="https://example.com/safety-plan.pdf"
             target="_blank"
             rel="noreferrer"
             className="flex flex-col items-center justify-center p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors active:scale-95 text-center"
           >
              <FileText className="h-6 w-6 text-blue-400 mb-2" />
              <span className="text-xs font-medium text-zinc-300">Site Safety Plan</span>
           </a>
        </div>
      </section>

    </div>
  );
}
