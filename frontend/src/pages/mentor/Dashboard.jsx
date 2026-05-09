import { DashboardHero } from '../../components/dashboard/DashboardHero';
import { TodaysSessionCard } from '../../components/dashboard/TodaysSessionCard';
import { TodaysAttendanceCard } from '../../components/dashboard/TodaysAttendanceCard';
import { ProgramOverviewCard } from '../../components/dashboard/ProgramOverviewCard';
import { RecentActivityCard } from '../../components/dashboard/RecentActivityCard';
import { RealtimeAttendanceTracker } from '../../components/dashboard/RealtimeAttendanceTracker';

export function Dashboard() {
  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <DashboardHero />
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TodaysSessionCard />
            <TodaysAttendanceCard />
          </div>
          <RealtimeAttendanceTracker />
        </div>
        
        <div className="space-y-6">
          <ProgramOverviewCard />
          <RecentActivityCard />
        </div>
      </div>
    </div>
  );
}
