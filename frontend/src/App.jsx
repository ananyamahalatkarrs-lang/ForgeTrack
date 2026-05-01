import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { RoleGuard } from './components/RoleGuard';
import { AppShell } from './components/layout/AppShell';

// Auth Pages
import { Login } from './pages/auth/Login';
import { ChangePassword } from './pages/auth/ChangePassword';

// Mentor Pages
import { Dashboard, MarkAttendance, StudentHistory, Materials, UploadCSV } from './pages/mentor';

// Student Pages
import { MyAttendance, UpcomingSessions, StudentMaterials } from './pages/student';

// Error Pages
import { Forbidden } from './pages/errors/Forbidden';

// Root Redirect Component
function RootRedirect() {
  // Temporarily bypassed for debugging
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/403" element={<Forbidden />} />
          
          {/* Root Redirect based on role */}
          <Route path="/" element={<RootRedirect />} />

          {/* Authenticated Routes wrapped in AppShell */}
          <Route element={<AppShell />}>
            
            {/* Mentor Routes */}
            <Route path="/dashboard" element={<RoleGuard allowedRoles={['mentor']}><Dashboard /></RoleGuard>} />
            <Route path="/attendance" element={<RoleGuard allowedRoles={['mentor']}><MarkAttendance /></RoleGuard>} />
            <Route path="/history" element={<RoleGuard allowedRoles={['mentor']}><StudentHistory /></RoleGuard>} />
            <Route path="/materials" element={<RoleGuard allowedRoles={['mentor']}><Materials /></RoleGuard>} />
            <Route path="/upload" element={<RoleGuard allowedRoles={['mentor']}><UploadCSV /></RoleGuard>} />

            {/* Student Routes */}
            <Route path="/me/attendance" element={<RoleGuard allowedRoles={['student']}><MyAttendance /></RoleGuard>} />
            <Route path="/me/upcoming" element={<RoleGuard allowedRoles={['student']}><UpcomingSessions /></RoleGuard>} />
            <Route path="/me/materials" element={<RoleGuard allowedRoles={['student']}><StudentMaterials /></RoleGuard>} />

          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
