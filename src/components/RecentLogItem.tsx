type FireTimestamp = { seconds: number };

type RecentJob = {
  jobType?: string;
  startTime?: FireTimestamp;
  endTime?: FireTimestamp;
  photos?: unknown[];
};

// A simple utility to format Firestore Timestamps
const formatDate = (timestamp?: FireTimestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleString();
};

// A simple utility to calculate duration between two Timestamps
const formatDuration = (start?: FireTimestamp, end?: FireTimestamp) => {
  if (!start || !end) return 'N/A';
  const diff = end.seconds - start.seconds;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = Math.floor(diff % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
