import { useAuth } from '../../hooks/useAuth';
import { Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export function TopBar() {
  const { userProfile, signOut } = useAuth();
  const location = useLocation();

  // Simple breadcrumb generator based on path
  const pathParts = location.pathname.split('/').filter(Boolean);
  const breadcrumb = pathParts.length > 0 
    ? pathParts[pathParts.length - 1].charAt(0).toUpperCase() + pathParts[pathParts.length - 1].slice(1)
    : 'Dashboard';

  return (
    <header className="h-16 flex items-center justify-between px-6 lg:px-12 sticky top-0 z-10">
      <div className="flex items-center text-primary text-body font-bold">
        <span>Attendance Portal</span>
        <span className="mx-3 text-tertiary font-normal">|</span>
        <span className="text-accent-glow">Welcome, {userProfile?.display_name || 'User'}</span>
      </div>

      <div className="flex items-center gap-6">
        {/* Search Placeholder */}
        <div className="relative hidden sm:block w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" strokeWidth={2} />
          <input 
            type="text" 
            placeholder="Search anything..." 
            className="w-full bg-surface-inset border border-border-default rounded-md pl-10 pr-4 py-2 text-primary text-[14px] focus:border-accent-glow focus:shadow-focus focus:outline-none transition-all placeholder:text-tertiary"
          />
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-body-sm font-medium text-primary">{userProfile?.display_name || 'User'}</p>
            <p className="text-caption text-tertiary capitalize">{userProfile?.role || 'Guest'}</p>
          </div>
          <button 
            onClick={() => signOut()}
            title="Logout"
            className="w-10 h-10 rounded-full bg-surface-raised border border-border-default flex items-center justify-center text-primary font-medium hover:bg-danger-fg/10 hover:text-danger-fg hover:border-danger-border transition-colors group"
          >
            <span className="group-hover:hidden">{userProfile?.display_name?.charAt(0).toUpperCase() || 'U'}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 hidden group-hover:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </div>
    </header>
  );
}
