# Execution Plan: Admin Dashboard (v1)

This plan breaks down the implementation of the Admin Dashboard into discrete tasks, each estimated to take 1 hour or less.

## Phase 1: Foundation & Access Control

- [ ] **Task 1: Setup Admin Route & Component Skeleton (45m)**
  - Create `src/pages/Admin.tsx` with placeholder content.
  - Add `/admin` route to the main React Router configuration.
  - Ensure it is wrapped in an authentication guard.

- [ ] **Task 2: Implement Admin Authorization Guard (45m)**
  - Create a custom hook (e.g., `useIsAdmin`) or utility to check if the current user's email is `gianni@omnitrix.tech`.
  - Update the router or the `Admin.tsx` component to redirect non-admin users to `/jobs`.

- [ ] **Task 3: Update Header Navigation (30m)**
  - Modify the Header component to conditionally render an "Admin" navigation link.
  - Use the admin check utility from Task 2 to determine visibility.

## Phase 2: Data Fetching Services

- [ ] **Task 4: Implement Global Jobs Fetching logic (45m)**
  - Add a service function to fetch `in_progress` jobs without filtering by `userId`.
  - Add another service function to fetch `completed` jobs without filtering by `userId`.

- [ ] **Task 5: Implement User Data Joining Logic (60m)**
  - Create a utility/service to fetch user details from the `users` collection based on a list of `userId`s.
  - Implement a mechanism to map/join these user details (Name, Email) to the fetched global jobs so the UI components have access to technician names.

## Phase 3: UI Implementation

- [ ] **Task 6: Build "Live Field Status" View (60m)**
  - Inside `Admin.tsx`, create a section/component for Live Field Status.
  - Wire up the real-time listener or fetcher for `in_progress` global jobs.
  - Display the jobs in a list/grid, showing the joined Technician Name and Job Type.

- [ ] **Task 7: Build "Master Job History" Table Skeleton & Data Binding (60m)**
  - Inside `Admin.tsx`, create a table component for Master Job History.
  - Wire up the data fetching for global `completed` jobs.
  - Bind basic columns: Tech Name/ID, Job Type, Elapsed Time.

- [ ] **Task 8: Implement Photo Thumbnails in Job History (45m)**
  - Update the "Master Job History" table to include a column for photos.
  - Render small thumbnail images for each photo URL associated with the completed job.
  - Handle empty states (jobs with no photos).

- [ ] **Task 9: Styling and Final Review (45m)**
  - Apply styling to the Admin Dashboard to match the application's design system.
  - Test the access control manually.
  - Verify real-time updates for "Live Field Status".