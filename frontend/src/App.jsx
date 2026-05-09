import { Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';


import { AuthProvider } from './components/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { RoleGuard } from './components/RoleGuard';
import { AppShell } from './components/layout/AppShell';

// Auth Pages
import { Login } from './pages/auth/Login';
import { ChangePassword } from './pages/auth/ChangePassword';

// Mentor Pages
import { Dashboard, MarkAttendance, StudentHistory, Materials, BulkUpload } from './pages/mentor';

// Student Pages
import { MyAttendance, UpcomingSessions, StudentMaterials } from './pages/student';

// Error Pages
import { Forbidden } from './pages/errors/Forbidden';

// Root Redirect Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-void text-danger-fg min-h-screen">
          <h1 className="text-display-sm mb-4">Critical Error Detected</h1>
          <pre className="bg-surface p-6 rounded-xl border border-danger-border overflow-auto text-xs">
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 bg-primary text-inverse px-6 py-3 rounded-xl font-bold"
          >
            Refresh App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}


function RootRedirect() {
  const { session, role, loading, status } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center space-y-4">
        <div className="text-secondary animate-pulse text-body-lg">Authenticating...</div>
        <div className="text-tertiary text-caption font-mono opacity-50">{status}</div>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  
  if (role === 'mentor') return <Navigate to="/dashboard" replace />;
  if (role === 'student') return <Navigate to="/me/attendance" replace />;
  
  return <Navigate to="/login" replace />; // fallback
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signin" element={<Login />} />
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
              <Route path="/upload" element={<RoleGuard allowedRoles={['mentor']}><BulkUpload /></RoleGuard>} />

              {/* Student Routes */}
              <Route path="/me/attendance" element={<RoleGuard allowedRoles={['student']}><MyAttendance /></RoleGuard>} />
              <Route path="/me/upcoming" element={<RoleGuard allowedRoles={['student']}><UpcomingSessions /></RoleGuard>} />
              <Route path="/me/materials" element={<RoleGuard allowedRoles={['student']}><StudentMaterials /></RoleGuard>} />

            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
