import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { BookOpen, UserCheck, Users, CalendarDays } from 'lucide-react';

export function DashboardHero() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({
    totalSessions: 0,
    attendancePct: '0',
    activeStudents: 0,
    lastSession: '—',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTickerStats() {
      try {
        // 1. Total Sessions
        const { count: sessionCount } = await supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true });

        // 2. Overall Attendance
        const { count: totalAtt } = await supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true });
        
        const { count: presentAtt } = await supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('present', true);

        const pct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;

        // 3. Active Students
        const { count: studentCount } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true);

        // 4. Last Session Date
        const { data: lastSessionData } = await supabase
          .from('sessions')
          .select('date')
          .order('date', { ascending: false })
          .limit(1);

        const lastDate = lastSessionData?.length > 0 
          ? new Date(lastSessionData[0].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
          : '—';

        setStats({
          totalSessions: sessionCount || 0,
          attendancePct: String(pct),
          activeStudents: studentCount || 0,
          lastSession: lastDate,
        });
      } catch (error) {
        console.error("Error fetching hero stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTickerStats();
  }, []);

  return (
    <div className="mb-12">
      <h1 className="text-display-hero mb-2 text-primary tracking-tight">
        Welcome Back, {userProfile?.display_name?.split(' ')[0] || 'Mentor'}
      </h1>
      <p className="text-body-sm text-secondary mb-8">
        Last login: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {/* Ticker Strip */}
      <div className="flex overflow-x-auto pb-4 hide-scrollbar">
        <div className="flex items-center space-x-8 shrink-0">
          
          <div className="flex items-center">
            <BookOpen className="w-4 h-4 text-secondary mr-3" strokeWidth={1.75} />
            <div>
              <p className="text-caption text-tertiary mb-0.5 uppercase tracking-wider">TOTAL SESSIONS</p>
              {loading ? <div className="h-6 w-12 bg-surface-raised rounded animate-pulse" /> : 
                <p className="text-body-lg font-semibold tabular-nums text-primary">{stats.totalSessions}</p>
              }
            </div>
          </div>
          
          <div className="w-[1px] h-10 bg-border-subtle" />

          <div className="flex items-center">
            <UserCheck className="w-4 h-4 text-secondary mr-3" strokeWidth={1.75} />
            <div>
              <p className="text-caption text-tertiary mb-0.5 uppercase tracking-wider">OVERALL ATTENDANCE</p>
              {loading ? <div className="h-6 w-16 bg-surface-raised rounded animate-pulse" /> : 
                <p className="text-body-lg font-semibold tabular-nums text-primary">{stats.attendancePct}%</p>
              }
            </div>
          </div>

          <div className="w-[1px] h-10 bg-border-subtle" />

          <div className="flex items-center">
            <Users className="w-4 h-4 text-secondary mr-3" strokeWidth={1.75} />
            <div>
              <p className="text-caption text-tertiary mb-0.5 uppercase tracking-wider">ACTIVE STUDENTS</p>
              {loading ? <div className="h-6 w-12 bg-surface-raised rounded animate-pulse" /> : 
                <p className="text-body-lg font-semibold tabular-nums text-primary">{stats.activeStudents}</p>
              }
            </div>
          </div>

          <div className="w-[1px] h-10 bg-border-subtle" />

          <div className="flex items-center">
            <CalendarDays className="w-4 h-4 text-secondary mr-3" strokeWidth={1.75} />
            <div>
              <p className="text-caption text-tertiary mb-0.5 uppercase tracking-wider">LAST SESSION</p>
              {loading ? <div className="h-6 w-16 bg-surface-raised rounded animate-pulse" /> : 
                <p className="text-body-lg font-semibold tabular-nums text-primary">{stats.lastSession}</p>
              }
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
