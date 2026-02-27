// Ensure smoke env vars are available even when this module is imported before the runner executes.
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

export const TARGET_BASE_URL = (process.env.OFA_URL || 'https://omnitrix-app.vercel.app').replace(/\/+$/, '');

export const TEST_EMAIL = process.env.OFA_TEST_EMAIL || '';
export const TEST_PASSWORD = process.env.OFA_TEST_PASSWORD || '';

export const ADMIN_EMAIL = process.env.OFA_ADMIN_EMAIL || '';
export const ADMIN_PASSWORD = process.env.OFA_ADMIN_PASSWORD || '';

export const TIMEOUT_MS = Number(process.env.OFA_TIMEOUT_MS || 60000);
export const HEADLESS = (process.env.OFA_HEADLESS || 'true').toLowerCase() !== 'false';

export const JOBS_URL = `${TARGET_BASE_URL}/jobs`;
export const ADMIN_URL = `${TARGET_BASE_URL}/admin`;
export const PROFILE_URL = `${TARGET_BASE_URL}/profile`;
