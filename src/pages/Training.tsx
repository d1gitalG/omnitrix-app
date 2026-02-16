import { useState } from 'react';
import { CheckCircle2, ChevronRight, FileText, Youtube } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Training() {
  const [completed, setCompleted] = useState<string[]>([]);
  
  const checklist = [
    { id: '1', title: 'Safety Briefing', desc: 'Read OSHA 10 basics.', category: 'Safety' },
    { id: '2', title: 'Tool Check', desc: 'Verify your kit has: strippers, punch tool, crimper.', category: 'Hardware' },
    { id: '3', title: 'T568B Mastery', desc: 'Recite the color code perfectly.', category: 'Skill' },
    { id: '4', title: 'Slack Setup', desc: 'Join #install channel.', category: 'Comms' },
  ];

  const handleToggle = (id: string) => {
    if (completed.includes(id)) {
      setCompleted(completed.filter(c => c !== id));
    } else {
      setCompleted([...completed, id]);
    }
  };

  const progress = Math.round((completed.length / checklist.length) * 100);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between">
         <h1 className="text-xl font-bold text-white">Training Center</h1>
         <div className="bg-zinc-800 text-xs text-zinc-400 px-3 py-1 rounded-full border border-zinc-700">
            Level 1 Tech
         </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
         <div className="flex justify-between text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">
            <span>Progress</span>
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
           <CheckCircle2 className="h-4 w-4" /> Day 1 Checklist
        </h2>
        <div className="space-y-2">
           {checklist.map((item) => (
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
           <Youtube className="h-4 w-4" /> Recommended
        </h2>
        <div className="grid gap-3">
           <a 
             href="https://www.youtube.com/watch?v=lnrL_rJdaQc" // Example: "How to Terminate Cat6"
             target="_blank"
             rel="noreferrer" 
             className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors group"
           >
              <div className="bg-red-500/10 p-3 rounded-lg group-hover:bg-red-500/20 transition-colors">
                 <Youtube className="h-6 w-6 text-red-500" />
              </div>
              <div>
                 <h3 className="font-medium text-zinc-200 text-sm">How to Terminate Cat6 (Pass-Through)</h3>
                 <p className="text-xs text-zinc-500 mt-1">Video • 5 mins</p>
              </div>
              <ChevronRight className="ml-auto h-5 w-5 text-zinc-600 group-hover:text-zinc-400" />
           </a>
        </div>
      </section>

      {/* PDF Manuals */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
           <FileText className="h-4 w-4" /> Docs
        </h2>
        <div className="grid grid-cols-2 gap-3">
           {['Tech Manual v1', 'Site Safety Plan'].map((doc) => (
             <button key={doc} className="flex flex-col items-center justify-center p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors active:scale-95 text-center">
                <FileText className="h-6 w-6 text-blue-400 mb-2" />
                <span className="text-xs font-medium text-zinc-300">{doc}</span>
             </button>
           ))}
        </div>
      </section>

    </div>
  );
}
