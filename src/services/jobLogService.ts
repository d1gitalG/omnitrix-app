import { db, storage } from '../firebaseConfig'; // Assuming firebaseConfig.ts is in the parent directory
import { collection, addDoc, doc, updateDoc, serverTimestamp, Timestamp, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface JobLog {
  id?: string;
  userId: string;
  jobId: string;
  clockIn: Timestamp;
  clockOut: Timestamp | null;
  photos: string[];
  notes: string;
}

/**
 * Creates a new job log entry when a user clocks in.
 * @param userId The ID of the user clocking in.
 * @param jobId The ID of the job being worked on.
 * @returns The ID of the newly created job log document.
 */
export const clockIn = async (userId: string, jobId: string): Promise<string> => {
  try {
    const newLogRef = await addDoc(collection(db, 'jobLogs'), {
      userId,
      jobId,
      clockIn: serverTimestamp(),
      clockOut: null,
      photos: [],
      notes: '',
    });
    console.log('Clocked in successfully. Log ID:', newLogRef.id);
    return newLogRef.id;
  } catch (error) {
    console.error('Error clocking in:', error);
    throw new Error('Failed to clock in.');
  }
};

/**
 * Updates a job log entry when a user clocks out.
 * @param logId The ID of the job log document to update.
 */
export const clockOut = async (logId: string): Promise<void> => {
  try {
    const logRef = doc(db, 'jobLogs', logId);
    await updateDoc(logRef, {
      clockOut: serverTimestamp(),
    });
    console.log('Clocked out successfully.');
  } catch (error) {
    console.error('Error clocking out:', error);
    throw new Error('Failed to clock out.');
  }
};

/**
 * Uploads a photo to Firebase Storage and adds its URL to a job log.
 * @param logId The ID of the job log to associate the photo with.
 * @param file The photo file to upload.
 * @returns The URL of the uploaded photo.
 */
export const addPhoto = async (logId: string, file: File): Promise<string> => {
  try {
    const storageRef = ref(storage, `jobLogs/${logId}/${file.name}`);
    const uploadResult = await uploadBytes(storageRef, file);
    const photoURL = await getDownloadURL(uploadResult.ref);

    const logRef = doc(db, 'jobLogs', logId);
    await updateDoc(logRef, {
      photos: arrayUnion(photoURL),
    });

    console.log('Photo added successfully.');
    return photoURL;
  } catch (error) {
    console.error('Error adding photo:', error);
    throw new Error('Failed to add photo.');
  }
};
