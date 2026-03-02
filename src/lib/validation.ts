import { z } from 'zod';

// Minimal “boundary validation” helpers.
// Goal: prevent crashes from unexpected Firestore shapes while keeping UI usable.

export const PhotoKindSchema = z.enum(['before', 'after', 'unsorted']);

export const JobPhotoSchema = z.object({
  url: z.string().min(1),
  kind: PhotoKindSchema.catch('unsorted'),
  uploadedAt: z.string().optional(),
});

// Firestore Timestamp-ish (we only rely on `.toDate()` in UI)
export const FireTimestampSchema = z
  .object({
    toDate: z.unknown(),
  })
  .refine((v) => typeof v.toDate === 'function', { message: 'toDate must be a function' });

export const JobLogSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(['in_progress', 'completed']).optional(),
  startTime: FireTimestampSchema.optional(),
  endTime: FireTimestampSchema.optional(),
  jobType: z.string().optional(),

  siteName: z.string().optional(),
  address: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  notes: z.string().optional(),

  photos: z.array(z.union([z.string(), JobPhotoSchema.partial()])).optional(),
});

export function safeParseWith<T>(schema: z.ZodType<T>, data: unknown): { ok: true; value: T } | { ok: false; issues: string } {
  const res = schema.safeParse(data);
  if (res.success) return { ok: true, value: res.data };
  return { ok: false, issues: res.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join(' | ') };
}
