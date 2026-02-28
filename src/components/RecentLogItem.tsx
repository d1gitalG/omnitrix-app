type FireTimestamp = {
  seconds?: number;
  toDate?: () => Date;
};

type RecentJob = {
  id?: string;
  jobType?: string;
  startTime?: FireTimestamp;
  endTime?: FireTimestamp;
  photos?: unknown[];
};

const toDateSafe = (t?: FireTimestamp) => {
  if (!t) return null;
  if (t.toDate) return t.toDate();
  if (typeof t.seconds === 'number') return new Date(t.seconds * 1000);
  return null;
};

// A simple utility to format Firestore Timestamps
const formatDate = (timestamp?: FireTimestamp) => {
  const d = toDateSafe(timestamp);
  if (!d) return 'N/A';
  return d.toLocaleString();
};

// A simple utility to calculate duration between two Timestamps
const formatDuration = (start?: FireTimestamp, end?: FireTimestamp) => {
  const s = toDateSafe(start);
  const e = toDateSafe(end);
  if (!s || !e) return 'N/A';
  const diffSeconds = Math.max(0, Math.floor((e.getTime() - s.getTime()) / 1000));
  const h = Math.floor(diffSeconds / 3600);
  const m = Math.floor((diffSeconds % 3600) / 60);
  const sec = Math.floor(diffSeconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

export default function RecentLogItem({ job }: { job: RecentJob }) {
  return (
    <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
      <div>
        <p className="text-sm font-bold text-white">
          {job.jobType || 'General'}
        </p>
        <p className="text-xs text-zinc-400">
          Completed: {formatDate(job.endTime)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono text-zinc-300">
          {formatDuration(job.startTime, job.endTime)}
        </p>
        <p className="text-xs text-zinc-500">
          {job.photos?.length || 0} photos
        </p>
      </div>
    </div>
  );
}
