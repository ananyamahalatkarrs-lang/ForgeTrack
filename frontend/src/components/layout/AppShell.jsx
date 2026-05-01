import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Outlet } from 'react-router-dom';

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-void text-primary font-body">
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden app-main">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-12 max-w-[1440px] mx-auto w-full relative z-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
