# PRD Delta: Admin Dashboard (v1)

## 1. Overview
This feature introduces an Admin Dashboard to provide global visibility into all jobs within the Omnitrix application. It is designed to give administrators a real-time overview of active field work and a comprehensive history of completed jobs across all technicians.

## 2. Requirements

### 2.1. Access Control & Navigation
- **Route:** A new route `/admin` will be created, served by `src/pages/Admin.tsx`.
- **Authorization:** Access to this route is strictly limited to the user with the email address `gianni@omnitrix.tech`.
- **Redirection:** If any other authenticated or unauthenticated user attempts to access `/admin`, they must be redirected to `/jobs` (or `/login` if unauthenticated).
- **Navigation:** The global header navigation must conditionally render an "Admin" link only if the currently logged-in user is `gianni@omnitrix.tech`.

### 2.2. Features
#### 2.2.1. Live Field Status
- Display a real-time list or grid of all jobs currently marked as `in_progress`.
- This view must show data across *all* users (technicians).
- Display relevant job details such as Job Type, Start Time, and the assigned Technician's Name/Email.

#### 2.2.2. Master Job History
- Display a comprehensive table or list of all `completed` jobs across the entire system.
- Columns/Fields to display:
  - Tech's ID / Name
  - Job Type
  - Elapsed Time (Duration)
  - Photo Thumbnails (links or small preview images of uploaded photos)

### 2.3. Data Fetching & Architecture
- **Global Queries:** Firestore queries for the Admin dashboard must omit the standard `where('userId', '==', uid)` filter to retrieve global data.
- **Data Joining:** Since job documents typically only store the `userId`, the application must join or fetch the corresponding user details (Name, Email) from the `users` collection to display human-readable technician information in the Admin views.
- **Indexes:** Ensure appropriate Firestore composite indexes are created if querying by status across all users requires it.