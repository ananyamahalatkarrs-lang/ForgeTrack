import { useAuth } from '../../hooks/useAuth';
import { Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export function TopBar() {
  const { userProfile } = useAuth();
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
          <div className="w-10 h-10 rounded-full bg-surface-raised border border-border-default flex items-center justify-center text-primary font-medium">
            {userProfile?.display_name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
