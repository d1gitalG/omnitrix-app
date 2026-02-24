import { Network, Search, Zap, User, Shield } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';

export function Layout() {
  const location = useLocation();
  const user = auth.currentUser;
  const isAdmin = user?.email === 'gianni@omnitrix.tech';

  const navItems = [
    { icon: Network, label: 'Jobs', path: '/jobs' },
    { icon: Search, label: 'TechRef', path: '/techref' },
    { icon: Zap, label: 'Training', path: '/training' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  if (isAdmin) {
    navItems.push({ icon: Shield, label: 'Admin', path: '/admin' });
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-white font-sans antialiased">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3 shadow-md">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-green-500 p-1.5">
            <Zap className="h-5 w-5 text-black fill-black" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">Omnitrix<span className="text-green-500">.app</span></span>
        </div>
        <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
          <User className="h-4 w-4 text-zinc-400" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-black p-4 pb-24">
        <div className="mx-auto max-w-md">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-900 pb-safe">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-1 flex-col items-center py-3 transition-colors",
                  isActive ? "text-green-500" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <item.icon className={cn("h-6 w-6 mb-1", isActive && "fill-current/20")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
