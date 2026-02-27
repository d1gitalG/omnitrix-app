import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Shield, Clock, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface JobLog {
  id: string;
  userId: string;
  userName?: string;
  type: string;
  jobType?: string; // Some docs use jobType instead of type
  status: 'in_progress' | 'completed';
  startTime: any;
  endTime?: any;
  photos?: any[]; // Normalized photos
  location?: string;
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
  const [_loading, setLoading] = useState(true);

  const isAdmin = auth.currentUser?.email === 'gianni@omnitrix.tech';

  useEffect(() => {
    if (!isAdmin) return;

    // Listen to in_progress jobs (no orderBy to avoid composite index requirement)
    const qActive = query(
      collection(db, 'job_logs'),
      where('status', '==', 'in_progress')
    );

    const unsubscribeActive = onSnapshot(qActive, (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobLog));
      // Sort client-side
      jobs.sort((a, b) => (b.startTime?.seconds || 0) - (a.startTime?.seconds || 0));
      setActiveJobs(jobs);
    }, (error) => {
      console.error("Admin active jobs error:", error);
    });

    // Listen to completed jobs (no orderBy to avoid composite index requirement)
    const qCompleted = query(
      collection(db, 'job_logs'),
      where('status', '==', 'completed')
    );

    const unsubscribeCompleted = onSnapshot(qCompleted, (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobLog));
      // Sort client-side
      jobs.sort((a, b) => (b.endTime?.seconds || 0) - (a.endTime?.seconds || 0));
      setCompletedJobs(jobs);
      setLoading(false);
    }, (error) => {
      console.error("Admin completed jobs error:", error);
      setLoading(false);
    });

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

      {/* Live Field Status */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl font-semibold">Live Field Status</h2>
          <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-500 rounded-full border border-yellow-500/20">
            {activeJobs.length} Active
          </span>
        </div>
        
        <div className="grid gap-4">
          {activeJobs.length === 0 ? (
            <p className="text-zinc-500 italic">No jobs currently in progress.</p>
          ) : (
            activeJobs.map(job => (
              <div key={job.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{job.type}</h3>
                    <p className="text-zinc-400 text-sm">Tech: {job.userName || job.userId}</p>
                  </div>
                  <span className="text-xs text-zinc-500">
                    Started {job.startTime?.toDate ? formatDistanceToNow(job.startTime.toDate(), { addSuffix: true }) : 'recently'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Master History */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <h2 className="text-xl font-semibold">Master History</h2>
        </div>

        <div className="space-y-4">
          {completedJobs.length === 0 ? (
            <p className="text-zinc-500 italic">No completed jobs found.</p>
          ) : (
            completedJobs.map(job => (
              <div key={job.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold">{job.type}</h3>
                    <p className="text-zinc-500 text-xs">Tech: {job.userName || job.userId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">
                      {job.endTime?.toDate ? job.endTime.toDate().toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>

                {/* Photo Gallery Thumbnail Map */}
                {job.photos && job.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {job.photos.map((photo, idx) => (
                      <img 
                        key={idx} 
                        src={photo} 
                        alt="Job detail" 
                        className="h-16 w-16 object-cover rounded-md border border-zinc-700 flex-shrink-0"
                      />
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
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Admin;
