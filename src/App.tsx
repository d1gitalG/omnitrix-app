import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import TechRef from './pages/TechRef';
import JobLogs from './pages/JobLogs';
import Training from './pages/Training';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/jobs" replace />} />
        <Route path="jobs" element={
          <ErrorBoundary>
            <JobLogs />
          </ErrorBoundary>
        } />
        <Route path="techref" element={<TechRef />} />
        <Route path="training" element={<Training />} />
        <Route path="profile" element={<Profile />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  );
}

export default App;
