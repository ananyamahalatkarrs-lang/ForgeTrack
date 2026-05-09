import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  BookOpen, 
  Upload, 
  UserCheck, 
  Calendar, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Sidebar() {
  const { role, userProfile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
        className={`flex items-center h-11 px-4 rounded-lg transition-colors
          ${isActive 
            ? 'bg-surface-raised text-primary border-l-2 border-accent-glow' 
            : 'hover:bg-surface text-secondary'
          }`}
      >
        <Icon className="w-5 h-5 mr-3" strokeWidth={1.75} />
        <span className="text-body">{label}</span>
      </Link>
    );
  };

  return (
    <aside className="w-[260px] hidden md:flex flex-col border-r border-border-subtle bg-canvas h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-display-sm">ForgeTrack</h1>
      </div>

      <div className="px-6 pb-6 border-b border-border-subtle">
        <p className="text-label text-tertiary mb-1 uppercase tracking-widest">Signed in as</p>
        <div className="flex flex-col">
          <p className="text-body font-bold truncate text-primary">
            {userProfile?.display_name || 'Loading...'}
          </p>
          <span className="inline-flex mt-1 text-[10px] font-bold uppercase tracking-tighter text-accent-glow bg-accent-glow/10 w-fit px-2 py-0.5 rounded border border-accent-glow/20">
            {role || 'User'}
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {role === 'mentor' && (
          <>
            <div>
              <p className="text-label text-tertiary mb-2 px-2">OVERVIEW</p>
              <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            </div>
            
            <div>
              <p className="text-label text-tertiary mb-2 px-2">ACTIVITY</p>
              <div className="space-y-1">
                <NavItem to="/attendance" icon={CheckSquare} label="Mark Attendance" />
                <NavItem to="/history" icon={Users} label="Student History" />
                <NavItem to="/materials" icon={BookOpen} label="Materials" />
              </div>
            </div>

            <div>
              <p className="text-label text-tertiary mb-2 px-2">DATA</p>
              <NavItem to="/upload" icon={Upload} label="Bulk Upload" />
            </div>
          </>
        )}

        {role === 'student' && (
          <>
            <div>
              <p className="text-label text-tertiary mb-2 px-2">OVERVIEW</p>
              <NavItem to="/me/attendance" icon={UserCheck} label="My Attendance" />
              <NavItem to="/me/upcoming" icon={Calendar} label="Upcoming" />
              <NavItem to="/me/materials" icon={BookOpen} label="Materials" />
            </div>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-border-subtle space-y-1">
        <NavItem to="/settings" icon={Settings} label="Settings" />
        <button 
          onClick={handleLogout}
          className="w-full flex items-center h-11 px-4 rounded-lg hover:bg-surface text-secondary transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" strokeWidth={1.75} />
          <span className="text-body">Logout</span>
        </button>
      </div>
    </aside>
  );
}
