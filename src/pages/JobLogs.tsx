import { useState, useEffect } from 'react';
import { Camera, Clock, LogIn, Loader2, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { db, auth, storage } from '../lib/firebase';
import { JobLogSchema, safeParseWith } from '../lib/validation';
import { collection, addDoc, updateDoc, doc, Timestamp, query, where, orderBy, limit, onSnapshot, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { signInWithEmailAndPassword, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import RecentLogItem from '../components/RecentLogItem';
import toast, { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '../components/ErrorBoundary';

type PhotoKind = 'before' | 'after' | 'unsorted';

type JobPhoto = {
  url: string;
  kind: PhotoKind;
  uploadedAt?: string;
};

type PendingPhoto = {
  file: File;
  previewUrl: string;
  kind: Exclude<PhotoKind, 'unsorted'>;
};

export default function JobLogs() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Job State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingClockAction, setPendingClockAction] = useState<'in' | 'out' | null>(null);
  const [jobType, setJobType] = useState('Service Call');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [jobPhotos, setJobPhotos] = useState<JobPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingBefore, setPendingBefore] = useState<PendingPhoto[]>([]);
  const [pendingAfter, setPendingAfter] = useState<PendingPhoto[]>([]);

  type FireTimestamp = { seconds?: number; toDate?: () => Date };
  type RecentJobItem = {
    id: string;
    jobType?: string;
    startTime?: FireTimestamp;
    endTime?: FireTimestamp;
    photos?: unknown[];
  };

  const [recentJobs, setRecentJobs] = useState<RecentJobItem[]>([]);

  // Site & Notes State
  const [siteName, setSiteName] = useState('');
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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
        const raw = jobDoc.data();

        const parsed = safeParseWith(JobLogSchema, raw);
        if (!parsed.ok) {
          console.warn('[JobLogs] Invalid job log shape:', parsed.issues);
        }

        const job = parsed.ok ? parsed.value : (raw as Record<string, unknown>);

        const readStr = (key: string) => {
          const v = (job as Record<string, unknown>)[key];
          return typeof v === 'string' ? v : '';
        };

        setActiveJobId(jobDoc.id);
        setStartTime((job as { startTime?: { toDate?: () => Date } })?.startTime?.toDate ? (job as { startTime: { toDate: () => Date } }).startTime.toDate() : null);

        const photosValue = (job as { photos?: unknown })?.photos;
        const rawPhotos: unknown[] = Array.isArray(photosValue) ? photosValue : [];

        const normalized: JobPhoto[] = rawPhotos
          .map((p: unknown) => {
            if (typeof p === 'string') return { url: p, kind: 'unsorted' as const };
            if (p && typeof p === 'object' && 'url' in p && typeof (p as { url?: unknown }).url === 'string') {
              const obj = p as { url: string; kind?: unknown; uploadedAt?: unknown };
              const kind: PhotoKind = obj.kind === 'before' || obj.kind === 'after' ? obj.kind : 'unsorted';
              return {
                url: obj.url,
                kind,
                uploadedAt: typeof obj.uploadedAt === 'string' ? obj.uploadedAt : undefined
              };
            }
            return null;
          })
          .filter((x): x is JobPhoto => !!x);

        setJobPhotos(normalized);

        // Sync site info from active job
        setSiteName(readStr('siteName'));
        setAddress(readStr('address'));
        setContactName(readStr('contactName'));
        setContactPhone(readStr('contactPhone'));
        setNotes(readStr('notes'));
      } else {
        setActiveJobId(null);
        setStartTime(null);
        setElapsedTime('00:00:00');
        setJobPhotos([]);

        // Clear job detail fields when no active job.
        // Otherwise the next Clock In can inherit old details and accidentally save them to the new job.
        setSiteName('');
        setAddress('');
        setContactName('');
        setContactPhone('');
        setNotes('');

        setPendingBefore((prev) => {
          prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
          return [];
        });
        setPendingAfter((prev) => {
          prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
          return [];
        });
      }
    });

    return () => unsubscribe();
  }, [user]);
  
    // 3. Listen for Recent Jobs
  useEffect(() => {
    if (!user) return;

    const toRecentJob = (d: { id: string; data: () => Record<string, unknown> }): RecentJobItem => {
      const data = d.data();
      return {
        id: d.id,
        jobType: typeof data.jobType === 'string' ? data.jobType : undefined,
        startTime: (data.startTime as FireTimestamp) || undefined,
        endTime: (data.endTime as FireTimestamp) || undefined,
        photos: Array.isArray(data.photos) ? data.photos : []
      };
    };

    // Prefer server-side ordering so we always include the most recent jobs.
    // This may require a Firestore composite index; if it fails, fallback to a larger un-ordered sample.
    const qPreferred = query(
      collection(db, 'job_logs'),
      where('userId', '==', user.uid),
      where('status', '==', 'completed'),
      orderBy('endTime', 'desc'),
      limit(10)
    );

    const qFallback = query(
      collection(db, 'job_logs'),
      where('userId', '==', user.uid),
      where('status', '==', 'completed'),
      limit(200)
    );

    let unsubscribe: (() => void) | null = null;

    const subscribe = (q: Parameters<typeof onSnapshot>[0]) =>
      onSnapshot(
        q,
        (snapshot) => {
          const jobs: RecentJobItem[] = snapshot.docs.map((d) => toRecentJob({ id: d.id, data: () => d.data() as Record<string, unknown> }));

          jobs.sort((a, b) => {
            const aMs = a?.endTime?.toDate ? a.endTime.toDate().getTime() : 0;
            const bMs = b?.endTime?.toDate ? b.endTime.toDate().getTime() : 0;
            return bMs - aMs;
          });

          setRecentJobs(jobs.slice(0, 5));
        },
        (err) => {
          // If the preferred query fails due to missing index, try the fallback.
          const msg = String((err as { message?: unknown })?.message || err);
          console.warn('[Recent Activity] query failed:', msg);
          if (q === qPreferred) {
            try {
              unsubscribe = subscribe(qFallback);
            } catch (e) {
              console.warn('[Recent Activity] fallback query failed:', e);
            }
          }
        }
      );

    unsubscribe = subscribe(qPreferred);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // 4. Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (activeJobId && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
            .toString()
            .padStart(2, '0')}`
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeJobId, startTime]);

  // 4a. If we have a resolved job state (clocked in or out), never leave the UI stuck in a submitting state.
  // This covers edge cases where `pendingClockAction` gets out of sync with snapshot timing.
  useEffect(() => {
    // When activeJobId changes (including to null), we know the app has a definitive state.
    setIsSubmitting(false);
  }, [activeJobId]);

  // 4b. Clock action resolution (don’t block UI on server ack)
  useEffect(() => {
    if (!pendingClockAction) return;

    if (pendingClockAction === 'in' && activeJobId) {
      setIsSubmitting(false);
      setPendingClockAction(null);
      toast.success('Successfully Clocked In!');
    }

    if (pendingClockAction === 'out' && !activeJobId) {
      setIsSubmitting(false);
      setPendingClockAction(null);
      toast.success('Successfully Clocked Out!');
    }
  }, [pendingClockAction, activeJobId]);

  // 4c. Safety timeout: don’t spin forever (clock actions)
  useEffect(() => {
    if (!pendingClockAction) return;

    const timeout = setTimeout(() => {
      toast.error('Sync is taking too long — check connection and try again.');
      setIsSubmitting(false);
      setPendingClockAction(null);
    }, 15000);

    return () => clearTimeout(timeout);
  }, [pendingClockAction]);

  // 4d. Extra safety: if `isSubmitting` ever gets stuck true (for any reason), clear it.
  // This prevents the Clock button from staying disabled forever in flaky network/offline cases.
  useEffect(() => {
    if (!isSubmitting) return;

    const t = setTimeout(() => {
      setIsSubmitting(false);
      setPendingClockAction(null);
    }, 20000);

    return () => clearTimeout(t);
  }, [isSubmitting]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Signed in!');
    } catch (err) {
      console.error('Sign in error:', err);
      setAuthError('Invalid email or password');
      toast.error('Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGps = (): Promise<
    | {
        lat: number;
        lng: number;
        accuracyM: number | null;
        capturedAt: string; // ISO
      }
    | null
  > => {
    if (!('geolocation' in navigator)) return Promise.resolve(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyM: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
            capturedAt: new Date().toISOString()
          });
        },
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60_000
        }
      );
    });
  };

  const handleClockIn = async () => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    setPendingClockAction('in');

    const startLocation = await getGps();

    addDoc(collection(db, 'job_logs'), {
      userId: user.uid,
      startTime: Timestamp.now(),
      status: 'in_progress',
      jobType: jobType,
      siteName: siteName,
      address: address,
      contactName: contactName,
      contactPhone: contactPhone,
      notes: notes,
      startLocation,
      photos: []
    }).catch((err) => {
      console.error('Error clocking in:', err);
      toast.error('Failed to clock in. Please try again.');
      setIsSubmitting(false);
      setPendingClockAction(null);
    });
  };

  const handleClockOut = async () => {
    if (!activeJobId || isSubmitting) return;
    setIsSubmitting(true);
    setPendingClockAction('out');

    const endLocation = await getGps();

    updateDoc(doc(db, 'job_logs', activeJobId), {
      endTime: Timestamp.now(),
      status: 'completed',
      endLocation
    }).catch((err) => {
      console.error('Error clocking out:', err);
      toast.error('Failed to clock out. Please try again.');
      setIsSubmitting(false);
      setPendingClockAction(null);
    });
  };

  const handleSaveNotes = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!activeJobId || isSavingNotes) return;
    setIsSavingNotes(true);
    setSaveError(null);
    try {
      await updateDoc(doc(db, 'job_logs', activeJobId), {
        notes: notes,
        siteName,
        address,
        contactName,
        contactPhone
      });
      setLastSavedAt(Date.now());
      if (!silent) toast.success('Job details saved');
    } catch (err) {
      console.error('Error saving job details:', err);
      setSaveError('Failed to save');
      if (!silent) toast.error('Failed to save details');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const validatePhotoFiles = (files: File[]) => {
    // File Validation (check all files)
    return files.filter((file) => {
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
  };

  const addPending = (kind: 'before' | 'after', files: File[]) => {
    const valid = validatePhotoFiles(files);
    if (valid.length === 0) return;

    const pending: PendingPhoto[] = valid.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      kind
    }));

    if (kind === 'before') setPendingBefore((prev) => [...prev, ...pending]);
    else setPendingAfter((prev) => [...prev, ...pending]);
  };

  const handlePhotoPick = (kind: 'before' | 'after') => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeJobId) return;

    addPending(kind, Array.from(e.target.files));

    // Allow selecting the same file again later
    e.target.value = '';
  };

  const clearPending = (kind: 'before' | 'after') => {
    if (kind === 'before') {
      setPendingBefore((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
        return [];
      });
      return;
    }

    setPendingAfter((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
  };

  const removePendingPhoto = (kind: 'before' | 'after', idx: number) => {
    if (kind === 'before') {
      setPendingBefore((prev) => {
        const item = prev[idx];
        if (item) URL.revokeObjectURL(item.previewUrl);
        return prev.filter((_, i) => i !== idx);
      });
      return;
    }

    setPendingAfter((prev) => {
      const item = prev[idx];
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // Cleanup pending preview URLs on unmount
  useEffect(() => {
    return () => {
      pendingBefore.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      pendingAfter.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save job details (debounced)
  useEffect(() => {
    if (!activeJobId) return;

    const t = setTimeout(() => {
      // Don't spam saves while a manual save is in-flight.
      if (isSavingNotes) return;
      void handleSaveNotes({ silent: true });
    }, 1000);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJobId, siteName, address, contactName, contactPhone, notes]);

  const uploadPendingPhotos = async (kind: 'before' | 'after') => {
    if (!activeJobId) return;

    const pending = kind === 'before' ? pendingBefore : pendingAfter;
    if (pending.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    let completedUploads = 0;
    const totalFiles = pending.length;

    try {
      for (const item of pending) {
        const file = item.file;
        const fileRef = ref(storage, `job-photos/${activeJobId}/${kind}/${Date.now()}_${file.name}`);

        const uploadTask = uploadBytesResumable(fileRef, file);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const fileProgress = snapshot.bytesTransferred / snapshot.totalBytes;
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

                const photo: JobPhoto = {
                  url: downloadURL,
                  kind,
                  uploadedAt: new Date().toISOString()
                };

                await updateDoc(doc(db, 'job_logs', activeJobId), {
                  photos: arrayUnion(photo)
                });

                completedUploads++;
                // Don't optimistically push into `jobPhotos` here.
                // The active-job `onSnapshot` listener will reflect the new photo from Firestore.
                // Optimistic + snapshot can cause UI duplicates (1 upload shows as 2).
                resolve();
              } catch (err) {
                console.error('Error saving URL:', err);
                toast.error(`Failed to save link for ${file.name}.`);
                reject(err);
              }
            }
          );
        });
      }

      toast.success(totalFiles > 1 ? `Uploaded ${totalFiles} photos!` : 'Photo uploaded!');
      clearPending(kind);
    } catch {
      console.error('Upload process encountered errors.');
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
            <label htmlFor="loginEmail" className="sr-only">Email</label>
            <input 
              id="loginEmail"
              name="email"
              type="email" 
              autoComplete="email"
              placeholder="Email" 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label htmlFor="loginPassword" className="sr-only">Password</label>
            <input 
              id="loginPassword"
              name="password"
              type="password" 
              autoComplete="current-password"
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

      {/* Job Details Section (Site Info & Notes) */}
      <section className={cn("bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 transition-opacity", !activeJobId && "opacity-50 pointer-events-none")}>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Site Info & Notes</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Site Name</label>
            <input 
              type="text"
              placeholder="e.g. Howard County Library"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Address</label>
            <input 
              type="text"
              placeholder="Street, City, Zip"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Contact Name</label>
            <input 
              type="text"
              placeholder="Who are you meeting?"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Contact Phone</label>
            <input 
              type="tel"
              placeholder="(555) 000-0000"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Job Notes</label>
          <textarea 
            placeholder="Describe work performed, materials used, or issues encountered..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:border-green-500 focus:outline-none resize-none"
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] text-zinc-600">
            {saveError
              ? saveError
              : isSavingNotes
                ? 'Saving…'
                : lastSavedAt
                  ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                  : 'Auto-saves while you type'}
          </p>
          <button
            onClick={() => handleSaveNotes()}
            disabled={!activeJobId || isSavingNotes}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSavingNotes ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
          </button>
        </div>
      </section>

      {/* Photo Upload Section */}
      <ErrorBoundary onReset={() => setUploading(false)}>
        <section
          data-testid="job-photos-section"
          className={cn("transition-opacity duration-300", !activeJobId && "opacity-50 pointer-events-none")}
        >
          <h3 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Job Photos</span>
            <span className="text-xs text-zinc-600 font-normal">{jobPhotos.length} uploaded</span>
          </h3>
          
          {/* Uploaded Photos */}
          {(() => {
            const before = jobPhotos.filter((p) => p.kind === 'before');
            const after = jobPhotos.filter((p) => p.kind === 'after');
            const unsorted = jobPhotos.filter((p) => p.kind === 'unsorted');

            const Grid = ({ title, items }: { title: string; items: JobPhoto[] }) => {
              if (items.length === 0) return null;
              return (
                <div className="mb-4">
                  <p className="mb-2 text-xs text-zinc-400 uppercase tracking-wider font-semibold">{title}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {items.map((p, i) => (
                      <div
                        key={`${p.url}-${i}`}
                        className="aspect-square rounded-lg overflow-hidden border border-zinc-800 relative group"
                      >
                        <img src={p.url} alt="Job" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-white underline">
                            View
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            };

            return (
              <>
                <Grid title="Before" items={before} />
                <Grid title="After" items={after} />
                <Grid title="Other" items={unsorted} />
              </>
            );
          })()}

          {/* Pending Uploads: BEFORE */}
          {pendingBefore.length > 0 && !uploading && (
            <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Pending BEFORE</p>
                <button type="button" className="text-xs text-zinc-500 hover:text-zinc-300" onClick={() => clearPending('before')}>
                  Clear
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {pendingBefore.map((p, idx) => (
                  <div key={`${p.file.name}-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-800">
                    <img src={p.previewUrl} alt={p.file.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 text-[10px] px-2 py-1 rounded bg-black/70 text-white hover:bg-black"
                      onClick={() => removePendingPhoto('before', idx)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                data-testid="upload-before-button"
                type="button"
                className="mt-3 w-full py-3 rounded-xl font-bold text-sm bg-emerald-500 text-black hover:bg-emerald-400"
                onClick={() => uploadPendingPhotos('before')}
              >
                Upload {pendingBefore.length} Before Photo{pendingBefore.length === 1 ? '' : 's'}
              </button>
            </div>
          )}

          {/* Pending Uploads: AFTER */}
          {pendingAfter.length > 0 && !uploading && (
            <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Pending AFTER</p>
                <button type="button" className="text-xs text-zinc-500 hover:text-zinc-300" onClick={() => clearPending('after')}>
                  Clear
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {pendingAfter.map((p, idx) => (
                  <div key={`${p.file.name}-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-800">
                    <img src={p.previewUrl} alt={p.file.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 text-[10px] px-2 py-1 rounded bg-black/70 text-white hover:bg-black"
                      onClick={() => removePendingPhoto('after', idx)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                data-testid="upload-after-button"
                type="button"
                className="mt-3 w-full py-3 rounded-xl font-bold text-sm bg-emerald-500 text-black hover:bg-emerald-400"
                onClick={() => uploadPendingPhotos('after')}
              >
                Upload {pendingAfter.length} After Photo{pendingAfter.length === 1 ? '' : 's'}
              </button>
            </div>
          )}

          {/* Pickers */}
          <div className="grid grid-cols-1 gap-3">
            <label
              className={cn(
                "flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl transition-all cursor-pointer group relative overflow-hidden",
                uploading
                  ? "bg-zinc-900 border-zinc-800 cursor-wait"
                  : "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700"
              )}
            >
              {uploading ? (
                <div className="flex flex-col items-center w-full px-8">
                  <Loader2 className="w-6 h-6 text-green-500 animate-spin mb-2" />
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-2">
                    <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-xs text-zinc-500">{Math.round(uploadProgress)}% Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-4 pb-4">
                  <div className="mb-2 p-2 rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors">
                    <Camera className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200" />
                  </div>
                  <p className="text-sm text-zinc-300 font-semibold">Select BEFORE photos</p>
                  <p className="text-xs text-zinc-500">(nothing uploads until you hit Upload)</p>
                </div>
              )}
              <input
                data-testid="jobPhotosBefore"
                id="jobPhotosBefore"
                name="jobPhotosBefore"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handlePhotoPick('before')}
                disabled={uploading}
                multiple
              />
            </label>

            <label
              className={cn(
                "flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl transition-all cursor-pointer group relative overflow-hidden",
                uploading
                  ? "bg-zinc-900 border-zinc-800 cursor-wait"
                  : "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700"
              )}
            >
              {uploading ? (
                <div className="flex flex-col items-center w-full px-8">
                  <Loader2 className="w-6 h-6 text-green-500 animate-spin mb-2" />
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-2">
                    <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-xs text-zinc-500">{Math.round(uploadProgress)}% Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-4 pb-4">
                  <div className="mb-2 p-2 rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors">
                    <Camera className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200" />
                  </div>
                  <p className="text-sm text-zinc-300 font-semibold">Select AFTER photos</p>
                  <p className="text-xs text-zinc-500">(nothing uploads until you hit Upload)</p>
                </div>
              )}
              <input
                data-testid="jobPhotosAfter"
                id="jobPhotosAfter"
                name="jobPhotosAfter"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handlePhotoPick('after')}
                disabled={uploading}
                multiple
              />
            </label>
          </div>
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
