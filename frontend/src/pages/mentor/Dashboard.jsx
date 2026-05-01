import { DashboardHero } from '../../components/dashboard/DashboardHero';
import { TodaysSessionCard } from '../../components/dashboard/TodaysSessionCard';
import { TodaysAttendanceCard } from '../../components/dashboard/TodaysAttendanceCard';
import { ProgramOverviewCard } from '../../components/dashboard/ProgramOverviewCard';
import { RecentActivityCard } from '../../components/dashboard/RecentActivityCard';

export function Dashboard() {
  return (
    <div className="animate-in fade-in duration-500">
      <DashboardHero />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <TodaysSessionCard />
        <TodaysAttendanceCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProgramOverviewCard />
        <RecentActivityCard />
      </div>
    </div>
  );
}
