# Omnitrix App - Audit & TODO

This document outlines the current state of the 'omnitrix-app' repository, identifies gaps between the UI and backend implementation, and prioritizes tasks for completion.

## 🛠 Repository Audit Summary

### 1. Job Logs (`src/pages/JobLogs.tsx`)
- **Implemented:**
  - Firebase Authentication (Email/Password).
  - Clock-in/Clock-out functionality via Firestore `job_logs` collection.
  - Real-time timer for active jobs.
  - Photo upload to Firebase Storage with link stored in Firestore.
  - Local state management for UI flow (Login -> Active Job).
- **Missing / Needs Work:**
  - **Job History:** The "Recent Activity" section is a hardcoded placeholder.
  - **Job Types:** Only "General" is currently supported in code, despite UI suggesting more.
  - **Location Tracking:** No GPS coordinates being saved with logs (Crucial for proof of work).
  - **Error Handling:** Minimal user feedback for failed uploads or connectivity issues.

### 2. TechRef (`src/pages/TechRef.tsx`)
- **Implemented:**
  - T568B Pinout visualization.
  - Searchable Default Password Vault (Hardcoded array).
  - Conduit Fill Calculator (Local math logic).
- **Missing / Needs Work:**
  - **Dynamic Data:** Password vault is static. Moving to Firestore would allow remote updates.
  - **Photo Reference:** "Job Photos" tool in Quick Tools is disabled/missing.
  - **Search Coverage:** Search currently only filters passwords, not pinouts or tools.

### 3. Profile (`src/pages/Profile.tsx`)
- **Implemented:**
  - Display Name and Role (Technician, Lead, Admin) syncing with Firestore `users` collection.
  - Basic Profile Save functionality.
  - Sign Out.
- **Missing / Needs Work:**
  - **Avatar Upload:** UI shows a placeholder; no mechanism to upload/change `photoURL`.
  - **Permissions:** Roles are saved but not enforced in the UI (e.g., Lead/Admin specific views).

### 4. Training (`src/pages/Training.tsx`)
- **Implemented:**
  - Progress bar and Day 1 Checklist (Local state only).
  - Static links to external resources (YouTube/PDF).
- **Missing / Needs Work:**
  - **Persistence:** Checklist progress resets on refresh. Needs Firestore sync.
  - **PDF Manuals:** Buttons are placeholders and do not trigger actual downloads/opens.
  - **Levels:** "Level 1 Tech" is a static badge; should reflect actual user progress.

---

## 🚀 Prioritized TODO Roadmap

### Phase 1: Persistence & Core Functionality (High Priority)
- [ ] **Job History:** Implement a real-time list of previous `job_logs` in the Job Logs page.
- [ ] **Training Persistence:** Sync the Training checklist state with Firestore so progress is saved.
- [ ] **GPS Integration:** Add `navigator.geolocation` to the `handleClockIn` and `handleClockOut` functions.
- [ ] **Avatar Management:** Implement Firebase Storage upload for profile pictures.

### Phase 2: Content & Tools (Medium Priority)
- [ ] **Dynamic TechRef:** Move the Password Vault to a Firestore collection for centralized management.
- [ ] **PDF Manuals:** Host manual PDFs in Firebase Storage and link the buttons in the Training page.
- [ ] **Comprehensive Search:** Update TechRef search to include pinouts and help articles.
- [ ] **Job Photo Gallery:** Implement a standalone photo reference tool (Quick Tool) to view common install standards.

### Phase 3: Polish & Advanced Features (Low Priority)
- [ ] **Role-Based Access Control (RBAC):** Hide/Show specific admin tools based on the user's role in Firestore.
- [ ] **Offline Mode:** Verify and optimize Firestore offline persistence (already initialized in `firebase.ts`).
- [ ] **Export Feature:** Allow technicians to export their weekly job logs as a PDF/CSV.
- [ ] **Site Safety Plan:** Connect the "Site Safety Plan" button to a dynamic document based on the current job site (future).

---
*Last Updated: 2026-02-16*
