import { Link } from 'react-router-dom';

export function Forbidden() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-danger-bg flex items-center justify-center mb-4 text-danger-fg">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
      </div>
      <h1 className="text-display-sm">Access Denied</h1>
      <p className="text-body-lg text-secondary max-w-md">
        You do not have permission to view this page. If you believe this is an error, please contact your mentor.
      </p>
      <div className="pt-4">
        <Link 
          to="/" 
          className="bg-surface-raised border border-border-default text-primary px-6 py-3 rounded-md hover:bg-surface transition-colors font-medium text-[14px]"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
