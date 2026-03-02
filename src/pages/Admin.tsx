import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Shield, Clock, CheckCircle, Image as ImageIcon, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type FireTimestamp = {
  seconds?: number;
  toDate?: () => Date;
};

type JobPhoto = { url: string; kind?: string };

type JobLocation = {
  lat: number;
  lng: number;
  accuracyM: number | null;
  capturedAt: string; // ISO
};

interface JobLog {
  id: string;
  userId: string;
  userName?: string;
  type: string;
  jobType?: string; // Some docs use jobType instead of type
  status: 'in_progress' | 'completed';
  startTime: FireTimestamp;
  endTime?: FireTimestamp;
  photos?: JobPhoto[]; // Normalized photos
  location?: string;
  startLocation?: JobLocation | null;
  endLocation?: JobLocation | null;
  siteName?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  notes?: string;
}

const Admin: React.FC = () => {
  const [activeJobs, setActiveJobs] = useState<JobLog[]>([]);
  const [completedJobs, setCompletedJobs] = useState<JobLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSort, setActiveSort] = useState<'newest' | 'oldest'>('newest');
  const [historySort, setHistorySort] = useState<'newest' | 'oldest'>('newest');

  const isAdmin = auth.currentUser?.email === 'gianni@omnitrix.tech';

  const normalizePhotos = (photos: unknown) => {
    if (!Array.isArray(photos)) return [] as JobPhoto[];
    return photos
      .map((p: unknown) => {
        if (typeof p === 'string') return { url: p };
        if (p && typeof p === 'object' && 'url' in p && typeof (p as { url?: unknown }).url === 'string') {
          const obj = p as { url: string; kind?: unknown };
          return { url: obj.url, kind: typeof obj.kind === 'string' ? obj.kind : undefined };
        }
        return null;
      })
      .filter((x): x is JobPhoto => !!x);
  };

  const mapsUrl = (loc: JobLocation) => {
    const q = `${loc.lat},${loc.lng}`;
    return `https://www.google.com/maps?q=${encodeURIComponent(q)}`;
  };

  const getJobType = (job: JobLog) => (job.jobType || job.type || '').toString();

  const matchesSearch = (job: JobLog) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;

    const hay = [
      getJobType(job),
      job.userName || '',
      job.userId || '',
      job.siteName || '',
      job.address || '',
      job.contactName || '',
      job.contactPhone || '',
      job.notes || ''
    ]
      .join(' | ')
      .toLowerCase();

    return hay.includes(q);
  };

  useEffect(() => {
    if (!isAdmin) return;

    // Listen to in_progress jobs (no orderBy to avoid composite index requirement)
    const qActive = query(
      collection(db, 'job_logs'),
      where('status', '==', 'in_progress')
    );

    const unsubscribeActive = onSnapshot(
      qActive,
      (snapshot) => {
        const jobs = snapshot.docs.map((docSnap) => {
          const raw = docSnap.data() as Record<string, unknown>;
          return { id: docSnap.id, ...(raw as unknown as Omit<JobLog, 'id' | 'photos'>), photos: normalizePhotos(raw.photos) } as JobLog;
        });
        setActiveJobs(jobs);
      },
      (error) => {
        console.error('Admin active jobs error:', error);
      }
    );

    // Listen to completed jobs (no orderBy to avoid composite index requirement)
    const qCompleted = query(
      collection(db, 'job_logs'),
      where('status', '==', 'completed')
    );

    const unsubscribeCompleted = onSnapshot(
      qCompleted,
      (snapshot) => {
        const jobs = snapshot.docs.map((docSnap) => {
          const raw = docSnap.data() as Record<string, unknown>;
          return { id: docSnap.id, ...(raw as unknown as Omit<JobLog, 'id' | 'photos'>), photos: normalizePhotos(raw.photos) } as JobLog;
        });
        setCompletedJobs(jobs);
      },
      (error) => {
        console.error('Admin completed jobs error:', error);
      }
    );

    return () => {
      unsubscribeActive();
      unsubscribeCompleted();
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/jobs" replace />;
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <Shield className="h-8 w-8 text-green-500" />
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </header>

      {/* Search / Filters */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search jobs (site, notes, tech, type…)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>
        </div>
        <p className="mt-2 text-[11px] text-zinc-600">
          Tip: Search matches job type, site/address, contact, notes, tech id/name.
        </p>
      </section>

      {/* Live Field Status */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <h2 className="text-xl font-semibold">Live Field Status</h2>
            <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-500 rounded-full border border-yellow-500/20">
              {activeJobs.filter(matchesSearch).length} Active
            </span>
          </div>
          <select
            value={activeSort}
            onChange={(e) => setActiveSort(e.target.value as 'newest' | 'oldest')}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        <div className="grid gap-4">
          {(() => {
            const filtered = activeJobs.filter(matchesSearch);
            filtered.sort((a, b) => {
              const aS = a.startTime?.seconds || 0;
              const bS = b.startTime?.seconds || 0;
              return activeSort === 'newest' ? bS - aS : aS - bS;
            });

            if (filtered.length === 0) {
              return <p className="text-zinc-500 italic">No active jobs match your search.</p>;
            }

            return filtered.map((job) => (
              <div key={job.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg truncate">{getJobType(job) || 'Job'}</h3>
                    <p className="text-zinc-400 text-sm truncate">Tech: {job.userName || job.userId}</p>
                    {(job.siteName || job.address) && (
                      <p className="text-zinc-500 text-xs mt-1 truncate">
                        {job.siteName ? job.siteName : ''}
                        {job.siteName && job.address ? ' • ' : ''}
                        {job.address ? job.address : ''}
                      </p>
                    )}
                    {job.notes && <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{job.notes}</p>}

                    {job.startLocation && (
                      <p className="text-zinc-500 text-xs mt-1">
                        <a
                          href={mapsUrl(job.startLocation)}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-2 hover:text-green-400"
                        >
                          GPS (start)
                        </a>
                        {typeof job.startLocation.accuracyM === 'number'
                          ? ` • ${Math.round(job.startLocation.accuracyM)}m`
                          : ''}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 whitespace-nowrap">
                    Started{' '}
                    {job.startTime?.toDate
                      ? formatDistanceToNow(job.startTime.toDate(), { addSuffix: true })
                      : 'recently'}
                  </span>
                </div>
              </div>
            ));
          })()}
        </div>
      </section>

      {/* Master History */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h2 className="text-xl font-semibold">Master History</h2>
            <span className="ml-2 px-2 py-0.5 text-xs bg-green-500/10 text-green-500 rounded-full border border-green-500/20">
              {completedJobs.filter(matchesSearch).length}
            </span>
          </div>
          <select
            value={historySort}
            onChange={(e) => setHistorySort(e.target.value as 'newest' | 'oldest')}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        <div className="space-y-4">
          {(() => {
            const filtered = completedJobs.filter(matchesSearch);
            filtered.sort((a, b) => {
              const aS = a.endTime?.seconds || 0;
              const bS = b.endTime?.seconds || 0;
              return historySort === 'newest' ? bS - aS : aS - bS;
            });

            if (filtered.length === 0) {
              return <p className="text-zinc-500 italic">No completed jobs match your search.</p>;
            }

            return filtered.map((job) => (
              <div key={job.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3 gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold truncate">{getJobType(job) || 'Job'}</h3>
                    <p className="text-zinc-500 text-xs truncate">Tech: {job.userName || job.userId}</p>
                    {(job.siteName || job.address) && (
                      <p className="text-zinc-600 text-xs mt-1 truncate">
                        {job.siteName ? job.siteName : ''}
                        {job.siteName && job.address ? ' • ' : ''}
                        {job.address ? job.address : ''}
                      </p>
                    )}
                    {job.notes && <p className="text-zinc-600 text-xs mt-1 line-clamp-2">{job.notes}</p>}

                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                      {job.startLocation && (
                        <a
                          href={mapsUrl(job.startLocation)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-500 text-xs underline underline-offset-2 hover:text-green-400"
                        >
                          GPS (start)
                        </a>
                      )}
                      {job.endLocation && (
                        <a
                          href={mapsUrl(job.endLocation)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-500 text-xs underline underline-offset-2 hover:text-green-400"
                        >
                          GPS (end)
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500 whitespace-nowrap">
                      {job.endTime?.toDate ? job.endTime.toDate().toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>

                {/* Photo Gallery Thumbnail Map */}
                {job.photos && job.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {job.photos.map((p, idx: number) => (
                      <a key={idx} href={p.url} target="_blank" rel="noreferrer">
                        <img
                          src={p.url}
                          alt="Job detail"
                          className="h-16 w-16 object-cover rounded-md border border-zinc-700 flex-shrink-0"
                        />
                      </a>
                    ))}
                  </div>
                )}

                {(!job.photos || job.photos.length === 0) && (
                  <div className="flex items-center gap-2 text-zinc-600 text-xs italic">
                    <ImageIcon className="h-3 w-3" />
                    No photos uploaded
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      </section>
    </div>
  );
};

export default Admin;
