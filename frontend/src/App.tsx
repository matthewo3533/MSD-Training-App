import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Intakes from './pages/Intakes';
import IntakeDetail from './pages/IntakeDetail';
import TraineeProfile from './pages/TraineeProfile';
import CreateSession from './pages/CreateSession';
import SkillGroups from './pages/SkillGroups';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import DailySummary from './pages/DailySummary';
import ViewReport from './pages/ViewReport';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/intakes"
            element={
              <PrivateRoute>
                <Intakes />
              </PrivateRoute>
            }
          />
          <Route
            path="/intakes/:id"
            element={
              <PrivateRoute>
                <IntakeDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/trainees/:id"
            element={
              <PrivateRoute>
                <TraineeProfile />
              </PrivateRoute>
            }
          />
          <Route
            path="/sessions/create"
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'MANAGER', 'TRAINER']}>
                <CreateSession />
              </PrivateRoute>
            }
          />
          <Route
            path="/sessions/:id/edit"
            element={
              <PrivateRoute allowedRoles={['ADMIN', 'MANAGER', 'TRAINER']}>
                <CreateSession />
              </PrivateRoute>
            }
          />
          <Route
            path="/intakes/:id/skills"
            element={
              <PrivateRoute>
                <SkillGroups />
              </PrivateRoute>
            }
          />
          <Route
            path="/sessions/:id/report"
            element={
              <PrivateRoute>
                <ViewReport />
              </PrivateRoute>
            }
          />
          <Route
            path="/sessions/:id/summary/edit"
            element={
              <PrivateRoute>
                <DailySummary />
              </PrivateRoute>
            }
          />
          {/* Legacy route - redirect to view if summary exists, otherwise edit */}
          <Route
            path="/sessions/:id/summary"
            element={
              <PrivateRoute>
                <DailySummary />
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <PrivateRoute allowedRoles={['ADMIN']}>
                <Users />
              </PrivateRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <PrivateRoute allowedRoles={['ADMIN']}>
                <AuditLogs />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

