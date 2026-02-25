import { useState, useEffect } from 'react';
import { Camera, Clock, LogIn, Loader2, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { db, auth, storage } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, Timestamp, query, where, orderBy, limit, onSnapshot, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { signInWithEmailAndPassword, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import RecentLogItem from '../components/RecentLogItem';
import toast, { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function JobLogs() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Job State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobType, setJobType] = useState('Service Call');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [jobPhotos, setJobPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  // 1. Listen for Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Listen for Active Jobs
  useEffect(() => {
    if (!user) return;

    // Query for any job that is "in_progress" for this user
    const q = query(
      collection(db, 'job_logs'),
      where('userId', '==', user.uid),
      where('status', '==', 'in_progress'),
      orderBy('startTime', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const jobDoc = snapshot.docs[0];
        const data = jobDoc.data();
        setActiveJobId(jobDoc.id);
        setStartTime(data.startTime.toDate());
        setJobPhotos(data.photos || []);
      } else {
        setActiveJobId(null);
        setStartTime(null);
        setElapsedTime('00:00:00');
        setJobPhotos([]);
      }
    });

    return () => unsubscribe();
  }, [user]);
  
    // 3. Listen for Recent Jobs
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'job_logs'),
      where('userId', '==', user.uid),
      where('status', '==', 'completed'),
      orderBy('endTime', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentJobs(jobs);
    });

    return () => unsubscribe();
  }, [user]);

  // 4. Timer Logic
  useEffect(() => {
    let interval: any;
    if (activeJobId && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeJobId, startTime]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Signed in!');
    } catch (err: any) {
      setAuthError('Invalid email or password');
      toast.error('Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockIn = async () => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'job_logs'), {
        userId: user.uid,
        startTime: Timestamp.now(),
        status: 'in_progress',
        jobType: jobType,
        photos: []
      });
      toast.success('Successfully Clocked In!');
    } catch (err) {
      console.error("Error clocking in:", err);
      toast.error("Failed to clock in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeJobId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'job_logs', activeJobId), {
        endTime: Timestamp.now(),
        status: 'completed'
      });
      // Force local state clear immediately so UI updates
      setActiveJobId(null);
      setStartTime(null);
      setElapsedTime('00:00:00');
      setJobPhotos([]);
      
      toast.success('Successfully Clocked Out!');
    } catch (err) {
      console.error("Error clocking out:", err);
      toast.error("Failed to clock out. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeJobId) return;
    
    const files = Array.from(e.target.files);

    // T4: File Validation (check all files)
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 10MB.`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is an invalid file type. Images only.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    let completedUploads = 0;
    const totalFiles = validFiles.length;

    try {
      for (const file of validFiles) {
        const fileRef = ref(storage, `job-photos/${activeJobId}/${Date.now()}_${file.name}`);
        
        // T5: Resumable Upload (Sequential for UI simplicity)
        const uploadTask = uploadBytesResumable(fileRef, file);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              // T6: Progress Calculation (weighted across all files)
              const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes);
              const totalProgress = ((completedUploads + fileProgress) / totalFiles) * 100;
              setUploadProgress(totalProgress);
            }, 
            (error) => {
              console.error(`Error uploading ${file.name}:`, error);
              toast.error(`Upload failed for ${file.name}.`);
              reject(error);
            }, 
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                await updateDoc(doc(db, 'job_logs', activeJobId), {
                  photos: arrayUnion(downloadURL)
                });
                completedUploads++;
                // Immediately update local state so they appear in grid!
                setJobPhotos(prev => [...prev, downloadURL]);
                resolve();
              } catch (err) {
                console.error("Error saving URL:", err);
                toast.error(`Failed to save link for ${file.name}.`);
                reject(err);
              }
            }
          );
        });
      }
      toast.success(totalFiles > 1 ? `Successfully uploaded ${totalFiles} photos!` : 'Photo uploaded successfully!');
    } catch (err) {
      console.error("Upload process encountered errors.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading app...</div>;
  }

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm text-center">
          <div className="mx-auto bg-zinc-800 h-16 w-16 rounded-full flex items-center justify-center mb-4">
             <LogIn className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Tech Login</h2>
          <p className="text-zinc-500 text-sm mb-6">Enter your credentials to access job logs.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="email" 
              placeholder="Email" 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {authError && <p className="text-red-400 text-xs">{authError}</p>}
            <button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>
          <div className="mt-4 pt-4 border-t border-zinc-800">
             <p className="text-xs text-zinc-600">Don't have an account? Ask Gianni.</p>
          </div>
        </div>
      </div>
    );
  }

  // MAIN JOB LOGS UI
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster />
      
      {/* Header with Profile Link */}
      <div className="flex items-center justify-between">
         <h1 className="text-xl font-bold text-white">Job Logs</h1>
         <Link 
           to="/profile"
           className="flex items-center gap-2 text-xs text-zinc-500 hover:text-green-400 transition-colors"
         >
           <User className="h-4 w-4" />
           <span>Profile</span>
         </Link>
      </div>

      {/* Status Card */}
      <div className={cn(
        "rounded-2xl border p-6 text-center transition-all duration-500 relative overflow-hidden",
        activeJobId 
          ? "bg-green-950/20 border-green-500/30 shadow-[0_0_40px_rgba(34,197,94,0.15)]" 
          : "bg-zinc-900 border-zinc-800"
      )}>
        {/* Pulsing effect when active */}
        {activeJobId && (
            <div className="absolute inset-0 bg-green-500/5 animate-pulse pointer-events-none" />
        )}

        <div className="relative z-10">
            <div className="mb-4 flex justify-center">
            <div className={cn(
                "flex h-20 w-20 items-center justify-center rounded-full border-4 transition-all duration-500",
                activeJobId 
                ? "border-green-500 bg-green-500/20 text-green-400" 
                : "border-zinc-700 bg-zinc-800 text-zinc-500"
            )}>
                <Clock className={cn("h-10 w-10", activeJobId && "animate-pulse")} />
            </div>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-1">
            {activeJobId ? 'Clocked In' : 'Off the Clock'}
            </h2>
            <p className={cn("font-mono text-lg mb-6 tracking-widest", activeJobId ? "text-green-400" : "text-zinc-600")}>
            {elapsedTime}
            </p>

            <button
            onClick={activeJobId ? handleClockOut : handleClockIn}
            disabled={isSubmitting}
            className={cn(
                "w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-lg flex items-center justify-center disabled:opacity-60",
                activeJobId
                ? "bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20 shadow-red-900/10"
                : "bg-green-600 text-white hover:bg-green-500 shadow-green-900/20"
            )}
            >
            {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : (activeJobId ? 'Clock Out' : 'Clock In')}
            </button>
            
            {/* Job Type Selector */}
            {!activeJobId && (
              <div className="mt-4 pt-4 border-t border-zinc-700/50 animate-in fade-in duration-500">
                <label htmlFor="jobType" className="block text-xs text-zinc-400 mb-1">Job Type</label>
                <select 
                  id="jobType"
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
                >
                  <option>Service Call</option>
                  <option>Installation</option>
                  <option>Preventative Maintenance</option>
                  <option>Consultation</option>
                </select>
              </div>
            )}
        </div>
      </div>

      {/* Photo Upload Section */}
      <ErrorBoundary onReset={() => setUploading(false)}>
        <section className={cn("transition-opacity duration-300", !activeJobId && "opacity-50 pointer-events-none")}>
          <h3 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Job Photos</span>
            <span className="text-xs text-zinc-600 font-normal">{jobPhotos.length} uploaded</span>
          </h3>
          
          {/* Photo Grid */}
          {jobPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
               {jobPhotos.map((url, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden border border-zinc-800 relative group">
                     <img src={url} alt="Job" className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a href={url} target="_blank" rel="noreferrer" className="text-xs text-white underline">View</a>
                     </div>
                  </div>
               ))}
            </div>
          )}

          <label className={cn(
              "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all cursor-pointer group relative overflow-hidden",
              uploading ? "bg-zinc-900 border-zinc-800 cursor-wait" : "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700"
          )}>
            {uploading ? (
               <div className="flex flex-col items-center w-full px-8">
                  <Loader2 className="w-6 h-6 text-green-500 animate-spin mb-2" />
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-2">
                     <div 
                       className="bg-green-500 h-full transition-all duration-300" 
                       style={{ width: `${uploadProgress}%` }}
                     />
                  </div>
                  <p className="text-xs text-zinc-500">{Math.round(uploadProgress)}% Uploading...</p>
               </div>
            ) : (
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="mb-3 p-2 rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors">
                  <Camera className="w-6 h-6 text-zinc-400 group-hover:text-zinc-200" />
                  </div>
                  <p className="mb-1 text-sm text-zinc-400 group-hover:text-zinc-200">
                  <span className="font-semibold">Tap to upload</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                  Before/After photos
                  </p>
              </div>
            )}
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handlePhotoUpload}
              disabled={uploading}
              multiple
            />
          </label>
        </section>
      </ErrorBoundary>

      {/* Recent Activity */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Recent Activity
        </h3>
        <div className="space-y-3">
          {recentJobs.length > 0 ? (
            recentJobs.map(job => <RecentLogItem key={job.id} job={job} />)
          ) : (
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
              <p className="text-zinc-500 text-sm">No recent logs found.</p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
