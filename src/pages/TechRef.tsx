import { useState } from 'react';
import { Search, Lock, Copy, X, Calculator, Camera } from 'lucide-react';
import { cn } from '../lib/utils';

export default function TechRef() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  
  // Calculator State
  const [conduitSize, setConduitSize] = useState('0.75'); // 3/4" default
  const [cableType, setCableType] = useState('cat6');     // Cat6 default

  const passwords = [
    { brand: 'Hikvision (Old)', user: 'admin', pass: '12345' },
    { brand: 'Hikvision (New)', user: 'admin', pass: '123456789abc' },
    { brand: 'Dahua', user: 'admin', pass: 'admin' },
    { brand: 'Ubiquiti', user: 'ubnt', pass: 'ubnt' },
    { brand: 'Axis', user: 'root', pass: 'pass' },
  ];

  // Rough approximation for NEC 40% fill
  // Area = pi * r^2. 40% of that area / cable area
  const calculateFill = (size: string, type: string) => {
    // Inner Diameter (approx for EMT)
    const diameters: Record<string, number> = {
      '0.5': 0.622,
      '0.75': 0.824,
      '1.0': 1.049,
      '1.25': 1.380,
      '1.5': 1.610,
      '2.0': 2.067,
      '3.0': 3.068,
      '4.0': 4.026,
    };

    // Cable Diameter (approx plenum)
    const cableODs: Record<string, number> = {
      'cat5e': 0.20,
      'cat6': 0.24,
      'cat6a': 0.30,
    };

    const conduitID = diameters[size];
    const cableOD = cableODs[type];

    const conduitArea = Math.PI * Math.pow(conduitID / 2, 2);
    const cableArea = Math.PI * Math.pow(cableOD / 2, 2);
    
    // NEC limit is 40% fill for >2 cables
    const maxFillArea = conduitArea * 0.40;
    
    return Math.floor(maxFillArea / cableArea);
  };

  const maxCables = calculateFill(conduitSize, cableType);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* Calculator Modal Overlay */}
      {isCalculatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 p-4 bg-zinc-900">
                 <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-green-500" />
                    <h3 className="font-semibold text-white">Conduit Fill (40%)</h3>
                 </div>
                 <button 
                   onClick={() => setIsCalculatorOpen(false)}
                   className="rounded-full p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                 >
                    <X className="h-5 w-5" />
                 </button>
              </div>
              
              <div className="p-6 space-y-6">
                 {/* Result Display */}
                 <div className="text-center">
                    <div className="text-6xl font-bold text-white mb-1 tracking-tighter">
                       {maxCables}
                    </div>
                    <p className="text-sm text-zinc-500 uppercase tracking-wide font-medium">Max Cables</p>
                 </div>

                 {/* Inputs */}
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider ml-1">Conduit Size (EMT)</label>
                       <div className="grid grid-cols-4 gap-2">
                          {['0.5', '0.75', '1.0', '1.25', '1.5', '2.0', '3.0', '4.0'].map((s) => (
                             <button
                               key={s}
                               onClick={() => setConduitSize(s)}
                               className={cn(
                                 "py-2 px-1 rounded-lg text-sm font-medium transition-all border",
                                 conduitSize === s 
                                    ? "bg-green-500/10 border-green-500/50 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]" 
                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                               )}
                             >
                                {s}"
                             </button>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider ml-1">Cable Type</label>
                       <div className="grid grid-cols-3 gap-2">
                          {['cat5e', 'cat6', 'cat6a'].map((t) => (
                             <button
                               key={t}
                               onClick={() => setCableType(t)}
                               className={cn(
                                 "py-2 px-1 rounded-lg text-sm font-medium transition-all border uppercase",
                                 cableType === t 
                                    ? "bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                               )}
                             >
                                {t}
                             </button>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 flex gap-3 items-start">
                    <span className="text-lg">⚠️</span>
                    <p className="text-xs text-yellow-200/80 leading-relaxed">
                       Based on NEC 40% fill rule. Actual capacity may vary by cable manufacturer OD and bends. When in doubt, size up.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <label htmlFor="techRefSearch" className="sr-only">Search</label>
        <input 
          id="techRefSearch"
          name="search"
          type="text" 
          autoComplete="off"
          placeholder="Search pinouts, passwords..." 
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Pinout Section (T568B Only) */}
      <section>
        <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Standard Pinout (T568B)
            </h2>
            <span className="text-[10px] text-zinc-500 bg-zinc-900/50 px-2 py-0.5 rounded border border-zinc-800">Clip Down</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-sm relative group">
          
          <div className="grid grid-cols-8 divide-x divide-zinc-900 border-b border-zinc-900">
            {/* Pin Headers */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((pin) => (
              <div key={pin} className="py-2 text-center text-xs font-mono text-zinc-600 bg-zinc-900/30">
                {pin}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-8 h-16 divide-x divide-zinc-900/50">
            {/* Color Blocks */}
            <div className="bg-orange-400/10 flex items-center justify-center border-b-4 border-orange-500/60 relative">
                 <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                    <div className="w-0.5 h-full bg-orange-400 transform -skew-x-12"></div>
                </div>
                <span className="text-[10px] text-orange-200/70 -rotate-90 whitespace-nowrap font-mono">Org/W</span>
            </div>
            <div className="bg-orange-600 flex items-center justify-center border-b-4 border-orange-700">
                <span className="text-[10px] text-orange-100 -rotate-90 font-mono">Org</span>
            </div>
            <div className="bg-green-400/10 flex items-center justify-center border-b-4 border-green-500/60 relative">
                <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                    <div className="w-0.5 h-full bg-green-400 transform -skew-x-12"></div>
                </div>
                <span className="text-[10px] text-green-200/70 -rotate-90 whitespace-nowrap font-mono">Grn/W</span>
            </div>
            <div className="bg-blue-600 flex items-center justify-center border-b-4 border-blue-700">
                <span className="text-[10px] text-blue-100 -rotate-90 font-mono">Blu</span>
            </div>
            <div className="bg-blue-400/10 flex items-center justify-center border-b-4 border-blue-500/60 relative">
                <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                    <div className="w-0.5 h-full bg-blue-400 transform -skew-x-12"></div>
                </div>
                <span className="text-[10px] text-blue-200/70 -rotate-90 whitespace-nowrap font-mono">Blu/W</span>
            </div>
            <div className="bg-green-600 flex items-center justify-center border-b-4 border-green-700">
                <span className="text-[10px] text-green-100 -rotate-90 font-mono">Grn</span>
            </div>
            <div className="bg-amber-800/20 flex items-center justify-center border-b-4 border-amber-900/60 relative">
                 <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                    <div className="w-0.5 h-full bg-amber-700 transform -skew-x-12"></div>
                </div>
                <span className="text-[10px] text-amber-200/70 -rotate-90 whitespace-nowrap font-mono">Brn/W</span>
            </div>
            <div className="bg-amber-900 flex items-center justify-center border-b-4 border-amber-950">
                <span className="text-[10px] text-amber-100 -rotate-90 font-mono">Brn</span>
            </div>
          </div>
        </div>
      </section>

      {/* Password Vault */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Default Passwords
        </h2>
        <div className="grid gap-3">
          {passwords
            .filter(p => p.brand.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((item) => (
            <div key={item.brand} className="group flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700 shadow-sm">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-medium text-zinc-200 text-sm leading-tight">{item.brand}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 bg-zinc-950/50 px-1.5 py-0.5 rounded border border-zinc-800/50">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wide">U:</span>
                      <span className="text-xs text-zinc-300 font-mono">{item.user}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-green-950/20 px-1.5 py-0.5 rounded border border-green-900/20">
                      <span className="text-[10px] text-green-700 uppercase tracking-wide">P:</span>
                      <span className="text-xs text-green-400 font-mono select-all">{item.pass}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                className="rounded-md p-2 text-zinc-600 hover:bg-zinc-700 hover:text-zinc-200 transition-colors active:scale-95"
                title="Copy Password"
                onClick={() => {
                  navigator.clipboard.writeText(item.pass);
                }}
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Tools */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Quick Tools
        </h2>
        <div className="grid grid-cols-2 gap-3">
           <button 
              onClick={() => setIsCalculatorOpen(true)}
              className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center hover:bg-zinc-800 hover:border-zinc-700 transition-all active:scale-95 cursor-pointer group shadow-sm"
           >
              <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center mb-3 group-hover:bg-zinc-700 transition-colors border border-zinc-700">
                <span className="text-lg">📏</span>
              </div>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">Conduit Fill</span>
           </button>
           <button 
             className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center hover:bg-zinc-800 hover:border-zinc-700 transition-all active:scale-95 cursor-pointer group shadow-sm opacity-50 cursor-not-allowed"
             title="Coming Soon in Module C"
           >
              <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center mb-3 transition-colors border border-zinc-700">
                 <Camera className="h-5 w-5 text-zinc-500" />
              </div>
              <span className="text-xs font-medium text-zinc-500">Job Photos</span>
           </button>
        </div>
      </section>

    </div>
  );
}
